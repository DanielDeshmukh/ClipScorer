import json
from engine.scorer import _clean_json_response


def test_clean_json_response_plain():
    data = '[{"start_time": "01:00", "end_time": "02:00"}]'
    assert _clean_json_response(data) == data


def test_clean_json_response_markdown():
    data = '```json\n[{"start_time": "01:00"}]\n```'
    result = _clean_json_response(data)
    assert result.startswith("[")
    assert result.endswith("]")


def test_clean_json_response_with_text():
    data = 'Here is the result:\n```json\n[{"start_time": "01:00"}]\n```\nDone.'
    result = _clean_json_response(data)
    assert "[" in result
    assert "]" in result


def test_clean_json_response_extracts_array():
    data = 'Some text before ```json\n[{"a": 1}]\n```\n some text after'
    result = _clean_json_response(data)
    parsed = json.loads(result)
    assert isinstance(parsed, list)
    assert parsed[0]["a"] == 1
