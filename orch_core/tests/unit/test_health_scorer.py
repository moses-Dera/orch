import pytest
from app.core.health_scorer import compute_health_score, get_status_label, get_recommendation


def test_perfect_health_no_overrides():
    rate, score = compute_health_score(total_requests=100, total_overrides=0)
    assert rate == 0.0
    assert score == 100.0


def test_health_with_some_overrides():
    rate, score = compute_health_score(total_requests=100, total_overrides=10)
    assert rate == 10.0
    assert score == 90.0


def test_health_at_warning_threshold():
    rate, score = compute_health_score(total_requests=100, total_overrides=20)
    assert rate == 20.0
    assert score == 80.0


def test_health_at_critical_threshold():
    rate, score = compute_health_score(total_requests=100, total_overrides=40)
    assert rate == 40.0
    assert score == 60.0


def test_health_score_never_below_zero():
    rate, score = compute_health_score(total_requests=100, total_overrides=100)
    assert score == 0.0


def test_health_no_requests_returns_perfect():
    rate, score = compute_health_score(total_requests=0, total_overrides=0)
    assert rate == 0.0
    assert score == 100.0


def test_status_label_healthy():
    assert get_status_label(100.0) == "healthy"
    assert get_status_label(80.0) == "healthy"


def test_status_label_warning():
    assert get_status_label(79.9) == "warning"
    assert get_status_label(50.0) == "warning"


def test_status_label_critical():
    assert get_status_label(49.9) == "critical"
    assert get_status_label(0.0) == "critical"


def test_no_recommendation_when_healthy():
    assert get_recommendation("backend", 10.0, []) is None


def test_recommendation_at_warning():
    rec = get_recommendation("backend", 25.0, [])
    assert rec is not None
    assert "25%" in rec


def test_recommendation_at_critical_includes_reasons():
    reasons = ["too strict", "wrong pattern", "outdated"]
    rec = get_recommendation("backend", 45.0, reasons)
    assert rec is not None
    assert "too strict" in rec
    assert "45%" in rec
