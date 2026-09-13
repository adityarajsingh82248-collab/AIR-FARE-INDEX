import pytest
from COLLECTORS.base_collector import CollectionContext, new_run_id
from COLLECTORS.source_1_collector import AuthorizedPlaywrightCollector
from COLLECTORS.indigo_ndc_collector import IndigoNDCCollector
from PIPELINE.run_collection import _collector_for

def test_permission_gate():
    c=AuthorizedPlaywrightCollector("Restricted","https://example.com",False,selectors={})
    with pytest.raises(PermissionError):
        c.collect([])

def test_run_id():
    rid=new_run_id("Test")
    assert rid.startswith("RUN_")

def test_collector_for_builds_indigo_ndc_collector_without_crashing():
    # Regression test: _collector_for passes timeout_ms (derived from a
    # source's timeout_seconds) into every collector's shared kwargs, but
    # IndigoNDCCollector previously forwarded **kwargs straight to
    # BaseCollector.__init__, which doesn't accept timeout_ms -- crashing
    # before a live run could even authenticate.
    source = {
        "name": "IndiGo NDC", "url": "https://client.ndc.navitaire.com",
        "permitted": True, "status": "LIVE", "access_method": "indigo_ndc",
        "timeout_seconds": 30, "request_delay_seconds": 1.0, "max_retries": 3,
    }
    collector = _collector_for(source)
    assert isinstance(collector, IndigoNDCCollector)
    assert collector.timeout_seconds > 0
