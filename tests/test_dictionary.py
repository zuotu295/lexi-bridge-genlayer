import importlib.util
import json
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest

sdk = ModuleType("genlayer")
sdk.Address, sdk.DynArray = str, list
sdk.gl = SimpleNamespace(Contract=object, public=SimpleNamespace(write=lambda f: f, view=lambda f: f))
sys.modules["genlayer"] = sdk
spec = importlib.util.spec_from_file_location("lexi_bridge", Path(__file__).resolve().parents[1] / "contracts/lexi_bridge.py")
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)


class DictionaryResponses(unittest.TestCase):
    def check_response(self, payload, result):
        body = json.dumps(payload).encode()
        sdk.gl.nondet = SimpleNamespace(web=SimpleNamespace(get=lambda _: SimpleNamespace(body=body)))
        self.assertEqual(contract.dictionary_verdict("cord"), result)

    def test_exact_headword(self):
        self.check_response([{"word": "cord", "score": 1}], "VERIFIED")

    def test_explicit_missing_word(self):
        self.check_response([], "UNKNOWN_WORD")

    def test_unexpected_and_empty_results(self):
        for payload in ({}, [{"score": 1}], [{"word": None}]):
            with self.subTest(payload=payload):
                self.check_response(payload, "UNAVAILABLE")

    def test_unreadable_response_is_unavailable(self):
        sdk.gl.nondet = SimpleNamespace(web=SimpleNamespace(get=lambda _: SimpleNamespace(body=b"<html>")))
        self.assertEqual(contract.dictionary_verdict("cord"), "UNAVAILABLE")

    def test_transport_failure_cannot_be_a_lexical_verdict(self):
        def fail(_):
            raise TimeoutError()
        sdk.gl.nondet = SimpleNamespace(web=SimpleNamespace(get=fail))
        with self.assertRaises(TimeoutError):
            contract.dictionary_verdict("cord")

    def test_similar_word_is_not_an_exact_match(self):
        self.check_response([{"word": "card"}], "UNKNOWN_WORD")
