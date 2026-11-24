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
spec = importlib.util.spec_from_file_location(
    "lexi_bridge",
    Path(__file__).resolve().parents[1] / "contracts/lexi_bridge.py",
)
contract = importlib.util.module_from_spec(spec)
spec.loader.exec_module(contract)


class DictionaryResponses(unittest.TestCase):
    def set_response(self, payload, status=200):
        if payload is None:
            body = None
        elif isinstance(payload, bytes):
            body = payload
        else:
            body = json.dumps(payload).encode("utf8")
        sdk.gl.nondet = SimpleNamespace(
            web=SimpleNamespace(get=lambda url: SimpleNamespace(status=status, body=body))
        )

    def test_exact_headword_is_verified(self):
        self.set_response([{"word": "cord", "meanings": []}], status=200)
        self.assertEqual(contract.dictionary_verdict("cord"), "VERIFIED")

    def test_exact_headword_comparison_is_case_insensitive(self):
        self.set_response([{"word": "CORD", "meanings": []}], status=200)
        self.assertEqual(contract.dictionary_verdict("cord"), "VERIFIED")

    def test_http_404_without_body_is_an_unknown_word(self):
        self.set_response(None, status=404)
        self.assertEqual(contract.dictionary_verdict("colx"), "UNKNOWN_WORD")

    def test_http_404_with_documented_error_body_is_an_unknown_word(self):
        self.set_response({
            "title": "No Definitions Found",
            "message": "No entry",
            "resolution": "Try another word",
        }, status=404)
        self.assertEqual(contract.dictionary_verdict("colx"), "UNKNOWN_WORD")

    def test_other_api_error_is_unavailable(self):
        self.set_response({"title": "API Rate Limit Exceeded", "message": "Slow down"}, status=429)
        self.assertEqual(contract.dictionary_verdict("cord"), "UNAVAILABLE")

    def test_server_error_is_not_a_lexical_rejection(self):
        self.set_response({"title": "No Definitions Found"}, status=503)
        self.assertEqual(contract.dictionary_verdict("colx"), "UNAVAILABLE")

    def test_success_status_with_error_object_is_unavailable(self):
        self.set_response({"title": "No Definitions Found"}, status=200)
        self.assertEqual(contract.dictionary_verdict("colx"), "UNAVAILABLE")

    def test_unexpected_array_is_unavailable(self):
        for payload in ([], [{"word": None}], [{"word": "card"}]):
            with self.subTest(payload=payload):
                self.set_response(payload, status=200)
                self.assertEqual(contract.dictionary_verdict("cord"), "UNAVAILABLE")

    def test_malformed_json_is_unavailable(self):
        self.set_response(b"<html>not json</html>", status=200)
        self.assertEqual(contract.dictionary_verdict("cord"), "UNAVAILABLE")

    def test_transport_failure_is_unavailable(self):
        def fail(_url):
            raise TimeoutError()
        sdk.gl.nondet = SimpleNamespace(web=SimpleNamespace(get=fail))
        self.assertEqual(contract.dictionary_verdict("cord"), "UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
