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

    transit.controls
        .init();

  };
  
  return {init:init};
  
})();

