# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import json
import re
from genlayer import Address, DynArray, gl

# These fixed puzzle endpoints are supplied by the game designer.
START, GOAL, LIMIT = "cold", "card", 8
WORD = re.compile(r"[a-z]{4}")


def dictionary_verdict(word: str) -> str:
    response = gl.nondet.web.get("https://api.datamuse.com/words?max=100&sp=" + word)
    try:
        body = json.loads(response.body.decode("utf8"))
    except (ValueError, AttributeError):
        return "UNAVAILABLE"
    if not isinstance(body, list) or any(
        not isinstance(item, dict) or not isinstance(item.get("word"), str) for item in body
    ):
        return "UNAVAILABLE"
    if any(item["word"] == word for item in body):
        return "VERIFIED"
    return "UNKNOWN_WORD"


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
        return json.dumps({"host": str(self.host), "guest": str(self.guest), "phase": self.phase, "goal": GOAL,
                           "limit": LIMIT, "turn": str(turn) if self.phase == "PLAYING" else "",
                           "track": list(self.track), "attempts": [json.loads(row) for row in self.attempts]})
