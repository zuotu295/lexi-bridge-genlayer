# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
import re
from genlayer import Address, DynArray, gl

START, GOAL, LIMIT = "cold", "card", 8
WORD = re.compile(r"[a-z]{4}")
WIKTIONARY_API = "https://en.wiktionary.org/w/api.php?action=query&titles="


def dictionary_verdict(word: str) -> str:
    """Check for an exact English Wiktionary entry; API failures are not word rejections."""
    try:
        response = gl.nondet.web.get(
            WIKTIONARY_API + word + "&format=json&formatversion=2",
            headers={"User-Agent": "LexiBridge/2.0 (https://github.com/zuotu295/lexi-bridge-genlayer)"},
        )
        status = getattr(response, "status_code", None)
        if status is None:
            status = getattr(response, "status", None)
        if status != 200 or response.body is None:
            return "UNAVAILABLE"
        raw = response.body
        if isinstance(raw, bytes):
            raw = raw.decode("utf8")
        if not isinstance(raw, str):
            return "UNAVAILABLE"
        body = json.loads(raw)
    except Exception:
        return "UNAVAILABLE"

    if not isinstance(body, dict):
        return "UNAVAILABLE"
    query = body.get("query")
    pages = query.get("pages") if isinstance(query, dict) else None
    if not isinstance(pages, list) or len(pages) != 1 or not isinstance(pages[0], dict):
        return "UNAVAILABLE"

    page = pages[0]
    title = page.get("title")
    if not isinstance(title, str) or title.casefold() != word.casefold():
        return "UNAVAILABLE"
    if page.get("missing") is True or page.get("invalid") is True:
        return "UNKNOWN_WORD"
    if isinstance(page.get("pageid"), int) and page["pageid"] > 0:
        return "VERIFIED"
    return "UNAVAILABLE"


class LexiBridge(gl.Contract):
    host: Address
    guest: Address
    phase: str
    track: DynArray[str]
    attempts: DynArray[str]

    def __init__(self):
        self.host = gl.message.sender_address
        self.guest = Address("0x" + "0" * 40)
        self.phase = "WAITING"
        self.track.append(START)

    @gl.public.write
    def join(self):
        if self.phase != "WAITING" or gl.message.sender_address == self.host:
            raise gl.vm.UserError("An independent guest may join an open table once")
        self.guest = gl.message.sender_address
        self.phase = "PLAYING"

    @gl.public.write
    def move(self, word: str, expected_word: str):
        if self.phase != "PLAYING":
            raise gl.vm.UserError("The table is not playing")
        turn = self.host if len(self.track) % 2 else self.guest
        if gl.message.sender_address != turn:
            raise gl.vm.UserError("It is the other player's turn")
        current = self.track[len(self.track) - 1]
        if expected_word != current:
            raise gl.vm.UserError("The board changed")
        if not WORD.fullmatch(word) or sum(a != b for a, b in zip(word, current)) != 1:
            raise gl.vm.UserError("Change exactly one letter")
        if word in self.track:
            raise gl.vm.UserError("A word on the path cannot be reused")
        if len(self.attempts) >= 32:
            raise gl.vm.UserError("The attempt budget is exhausted")

        verdict = gl.eq_principle.strict_eq(lambda: dictionary_verdict(word))
        if verdict == "UNAVAILABLE":
            raise gl.vm.UserError("Dictionary unavailable; retry this turn")

        self.attempts.append(json.dumps({"actor": str(turn), "from": current, "word": word, "verdict": verdict}))
        if verdict == "VERIFIED":
            self.track.append(word)
            if word == GOAL:
                self.phase = "SOLVED"
            elif len(self.track) - 1 == LIMIT:
                self.phase = "EXHAUSTED"
        if len(self.attempts) == 32 and self.phase == "PLAYING":
            self.phase = "EXHAUSTED"

    @gl.public.view
    def board(self) -> str:
        turn = self.host if len(self.track) % 2 else self.guest
        return json.dumps({
            "host": str(self.host),
            "guest": str(self.guest),
            "phase": self.phase,
            "goal": GOAL,
            "limit": LIMIT,
            "turn": str(turn) if self.phase == "PLAYING" else "",
            "track": list(self.track),
            "attempts": [json.loads(row) for row in self.attempts],
        })
