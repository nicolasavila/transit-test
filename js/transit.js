var transit = transit || {};

//~ var google = google || {};

transit.core = (function () {
    'use strict';

    var config = {
        cgiUrl: '/cgi-bin/transit/editor.py'
    };

  function init() {
    transit.maps
        .init(config.cgiUrl)
        .addBboxLayer()
        .addRouteLayer()
        .addNotesLayer()
        .addGpxLayer()
        .addStopsLayer()
        .initControls();

    transit.dataInterface
        .init(config.cgiUrl);

    transit.controls
        .init();

  };
  
  return {init:init};
  
})();

