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
    def set_response(self, payload, status=200, legacy=False):
        if payload is None:
            body = None
        elif isinstance(payload, bytes):
            body = payload
        else:
            body = json.dumps(payload).encode("utf8")
        response = SimpleNamespace(body=body)
        if legacy:
            response.status = status
        else:
            response.status_code = status
        sdk.gl.nondet = SimpleNamespace(web=SimpleNamespace(get=lambda url, headers=None: response))

    def test_exact_entry_is_verified(self):
        self.set_response({"query": {"pages": [{"pageid": 123, "ns": 0, "title": "cord"}]}})
        self.assertEqual(contract.dictionary_verdict("cord"), "VERIFIED")

    def test_legacy_status_property_fallback(self):
        self.set_response({"query": {"pages": [{"pageid": 123, "ns": 0, "title": "cord"}]}}, legacy=True)
        self.assertEqual(contract.dictionary_verdict("cord"), "VERIFIED")

    def test_title_normalization_is_case_insensitive(self):
        self.set_response({"query": {"pages": [{"pageid": 123, "ns": 0, "title": "Cord"}]}})
        self.assertEqual(contract.dictionary_verdict("cord"), "VERIFIED")

    def test_missing_page_is_an_unknown_word(self):
        self.set_response({"query": {"pages": [{"ns": 0, "title": "colx", "missing": True}]}})
        self.assertEqual(contract.dictionary_verdict("colx"), "UNKNOWN_WORD")

    def test_invalid_page_is_an_unknown_word(self):
        self.set_response({"query": {"pages": [{"title": "colx", "invalid": True}]}})
        self.assertEqual(contract.dictionary_verdict("colx"), "UNKNOWN_WORD")

    def test_http_errors_are_unavailable(self):
        for status in (403, 429, 500, 503):
            with self.subTest(status=status):
                self.set_response({"query": {"pages": [{"ns": 0, "title": "colx", "missing": True}]}}, status=status)
                self.assertEqual(contract.dictionary_verdict("colx"), "UNAVAILABLE")

    def test_missing_body_is_unavailable(self):
        self.set_response(None, status=200)
        self.assertEqual(contract.dictionary_verdict("cord"), "UNAVAILABLE")

    def test_unexpected_response_shape_is_unavailable(self):
        for payload in ({}, {"query": {"pages": []}}, {"query": {"pages": [{"title": "cord"}]}}):
            with self.subTest(payload=payload):
                self.set_response(payload)
                self.assertEqual(contract.dictionary_verdict("cord"), "UNAVAILABLE")

    def test_malformed_json_is_unavailable(self):
        self.set_response(b"<html>not json</html>")
        self.assertEqual(contract.dictionary_verdict("cord"), "UNAVAILABLE")

    def test_transport_failure_is_unavailable(self):
        def fail(_url, headers=None):
            raise TimeoutError()
        sdk.gl.nondet = SimpleNamespace(web=SimpleNamespace(get=fail))
        self.assertEqual(contract.dictionary_verdict("cord"), "UNAVAILABLE")


if __name__ == "__main__":
    unittest.main()
