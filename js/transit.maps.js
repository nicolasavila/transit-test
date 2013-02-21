var transit = transit || {};

transit.maps = (function (OpenLayers) {
    'use strict';

    var my = {},
        map = {},
        vectorFormat = {},
        routesLayer = {},
        stopsLayer = {},
        bboxLayer = {},
        notesLayer = {},
        gpxLayer = {},
        controls = {},
        config = {
            div: 'map',
            vectorLayerUrl: {},
            strokeColor: 'blue',
            localOsm: true,
            INIT_LON: -64.1857371,
            INIT_LAT: -31.4128832,
            INIT_ZOOM: 12
        };

    my.init = function init(cgiUrl) {

        var baselayer, gmap, gsat;
        config.vectorLayerUrl = cgiUrl;

        map = new OpenLayers.Map(config.div);
        map.addControl(new OpenLayers.Control.LayerSwitcher());

        if (config.localOsm) {
            baselayer = new OpenLayers.Layer.OSM('Mosaico Local',
                'http://localhost:8005/${z}/${x}/${y}.png',
                {numZoomLevels: 19, alpha: true, isBaseLayer: true});
        } else {
            baselayer = new OpenLayers.Layer.OSM('OSM Map');
        }
        map.addLayer(baselayer);

        if (typeof (google) === 'object') {
            gmap = new OpenLayers.Layer.Google('Google Streets', {
                numZoomLevels: 20,
                animationEnabled: false
            });
            map.addLayer(gmap);
            gsat = new OpenLayers.Layer.Google('Google Satellite', {
                type: google.maps.MapTypeId.SATELLITE,
                numZoomLevels: 22,
                animationEnabled: false
            });
            map.addLayer(gsat);
            gsat.mapObject.setTilt(0);
        }

        map.setCenter(
            new OpenLayers.LonLat(config.INIT_LON, config.INIT_LAT)
                .transform(
                    new OpenLayers.Projection('EPSG:4326'),
                    map.getProjectionObject()
                ),
            config.INIT_ZOOM
        );

        vectorFormat = new OpenLayers.Format.GeoJSON({
            'internalProjection': map.baseLayer.projection,
            'externalProjection': new OpenLayers.Projection("EPSG:4326")
        });

        my.map = map;
        my.vectorFormat = vectorFormat;
        return my;
    };

    my.addNotesLayer = function addNotesLayer() {
        var notesStyleMap = new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({strokeColor: config.strokeColor,
                strokeWidth: 10, strokeOpacity: 1, pointRadius: 6,
                fillOpacity: 1,
                fontColor: "black", fontSize: "16px",
                fontFamily: "Courier New, monospace", fontWeight: "bold",
                labelAlign: "left", labelXOffset: "8", labelYOffset: "8",
                labelOutlineColor: "white", labelOutlineWidth: 3
                }),
            'select': new OpenLayers.Style({strokeColor: "red",
                strokeWidth: 3, pointRadius: 5
                })
        }),
            lookup = {
                "Start": {label : "${type}", fillColor: 'white',
                    strokeWidth: 3, strokeColor: 'black'},
                "End": {label : "${type}", fillColor: 'white',
                    strokeWidth: 3, strokeColor: 'black'},
                "Line": {strokeWidth: 10, strokeOpacity: 0.5}
            };

        notesStyleMap.addUniqueValueRules("default", "type", lookup);

        notesLayer = new OpenLayers.Layer.Vector('Notas', {
            styleMap: notesStyleMap
        });
        notesLayer.id = 'notes';

        map.addLayer(notesLayer);

        return my;
    };

    my.addGpxLayer = function addGpxLayer() {
        var gpxStyleMap = new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({strokeColor: 'black',
                strokeWidth: 2, strokeOpacity: 1, pointRadius: 6,
                fillOpacity: 0.8,
                label: '${name}',
                fontColor: "black", fontSize: "16px",
                fontFamily: "Courier New, monospace", fontWeight: "bold",
                labelAlign: "left", labelXOffset: "8", labelYOffset: "8",
                labelOutlineColor: "white", labelOutlineWidth: 3
                })
        });

        gpxLayer = new OpenLayers.Layer.Vector('Gpx', {
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: "",
                format: new OpenLayers.Format.GPX()
                }),
            //~ style: {strokeColor: "green", strokeWidth: 5, strokeOpacity: 0.5},
            styleMap: gpxStyleMap,
            projection: new OpenLayers.Projection("EPSG:4326")
        });

        gpxLayer.id = 'gpx';

        map.addLayer(gpxLayer);

        return my;
    };

    my.addRouteLayer = function addRouteLayer() {
        var routesStyleMap = new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
                strokeColor: "blue", strokeWidth: 8, strokeOpacity: 0.6
            }),
            'select': new OpenLayers.Style({
                strokeColor: "red", strokeWidth: 8, strokeOpacity: 0.8
            }),
            'vertex': new OpenLayers.Style({
                strokeColor: "black", strokeWidth: 2, strokeOpacity: 0.9,
                pointRadius: 8,
                fill: true, fillColor: 'white', fillOpacity: 0.6
            })
        });
        
        routesLayer = new OpenLayers.Layer.Vector('Recorrido', {
            styleMap: routesStyleMap,
            projection: new OpenLayers.Projection('EPSG:4326'),
            strategies: [new OpenLayers.Strategy.Fixed()],
            protocol: new OpenLayers.Protocol.HTTP({
                format: new OpenLayers.Format.GeoJSON(),
                url: config.vectorLayerUrl,
                params: {
                    database: 'dbRecorridos',
                    action: 'getShape'}
                })
            });

        routesLayer.id = 'routes';

        var endsRender = function(){
            var startFeature = notesLayer.getFeatureById('routeStart');
            var endFeature = notesLayer.getFeatureById('routeEnd');
            if (startFeature) {
                notesLayer.removeFeatures(startFeature);
            };
            if (endFeature) {
                notesLayer.removeFeatures(endFeature);
            };
            
            var route = routesLayer.features[0];
            var startPoint = route.geometry.components[0];
            var endPoint = route.geometry.components[route.geometry.components.length-1];
            
            startFeature = new OpenLayers.Feature.Vector(startPoint);
            startFeature.id = 'routeStart';
            startFeature.attributes.type = 'Start';
            
            endFeature = new OpenLayers.Feature.Vector(endPoint);
            endFeature.id = 'routeEnd';
            endFeature.attributes.type = 'End';
            
            notesLayer.addFeatures([startFeature,endFeature]);
        };

        routesLayer.events.register('loadend',routesLayer, endsRender)
        map.addLayer(routesLayer);
        my.routesLayer = routesLayer;

        return my;
    };

    my.addStopsLayer = function addStopsLayer() {
        stopsLayer = new OpenLayers.Layer.Vector('Paradas', {
            styleMap: new OpenLayers.StyleMap({
            'default': new OpenLayers.Style({
              strokeColor: 'black', strokeWidth: 3, strokeOpacity: 1, 
              pointRadius: 6, fillColor: 'yellow', fill: true, 
              fillOpacity: 1
              })
              ,
            'select': new OpenLayers.Style({
              strokeColor: 'black', strokeWidth: 3, strokeOpacity: 1, 
              pointRadius: 8, fillColor: 'red', fill: true, fillOpacity: 1,
              label: '${stop_id}',
              fontColor: "black", fontSize: "16px", 
              fontFamily: "Courier New, monospace", fontWeight: "bold",
              labelAlign: "left", labelXOffset: "8", labelYOffset: "12",
              labelOutlineColor: "white", labelOutlineWidth: 3
              })          
          }),
          projection: new OpenLayers.Projection('EPSG:4326'),
          strategies: [new OpenLayers.Strategy.Fixed()],
          protocol: new OpenLayers.Protocol.HTTP({
            format: new OpenLayers.Format.GeoJSON(),
            url: config.vectorLayerUrl,
            params: {
              database: 'dbRecorridos',
              action: 'getTripStops'}
          })
        });
        stopsLayer.id = 'stops';
        
        
        map.addLayer(stopsLayer);
        my.stopsLayer = stopsLayer;
        return my;
    };

    my.addBboxLayer = function addBboxLayer() {
        bboxLayer = new OpenLayers.Layer.Vector('Bbox Existing', {
          projection: new OpenLayers.Projection('EPSG:4326'),
          strategies: [new OpenLayers.Strategy.BBOX({resFactor: 1.1})],
          protocol: new OpenLayers.Protocol.HTTP({
            format: new OpenLayers.Format.GeoJSON(),
            url: config.vectorLayerUrl,
            params: {
              database: 'dbRecorridos',
              action: 'bbox'}
          })
        });
        bboxLayer.id = 'bbox';

        map.addLayer(bboxLayer);

        return my;
    };

    my.initControls = function initControls() {
        var firstGeolocation;

        controls.selectStops = new OpenLayers.Control.SelectFeature(
            [stopsLayer,bboxLayer],
            {
                id: 'selectStops',
                clickout: true, toggle: false,
                multiple: false, hover: false
                ,
                eventListeners: {
                    featurehighlighted: transit.controls.renderStopInfo,
                    featureunhighlighted: transit.controls.renderStopInfo
                }
            });

        map.addControl(controls.selectStops);

        controls.modifyStops = new OpenLayers.Control.ModifyFeature(
            stopsLayer,{id: 'modifyStops'});
        stopsLayer.events.register('featureselected',stopsLayer,
          transit.controls.renderStopInfo);
        stopsLayer.events.register('featureunselected',stopsLayer,
          transit.controls.renderStopInfo);

        bboxLayer.events.register('featureselected',bboxLayer,
          transit.controls.renderStopInfo);
        bboxLayer.events.register('featureunselected',bboxLayer,
          transit.controls.renderStopInfo);

        map.addControl(controls.modifyStops);

        controls.modifyShape = new OpenLayers.Control.ModifyFeature(
            routesLayer,{
                id: 'modifyShape',
                vertexRenderIntent: 'vertex'
            });
        map.addControl(controls.modifyShape);
        
        controls.drawStops = new OpenLayers.Control.DrawFeature(stopsLayer,
                                OpenLayers.Handler.Point);
        map.addControl(controls.drawStops);
        
        controls.geolocate = new OpenLayers.Control.Geolocate({
            bind: false,
            geolocationOptions: {
                enableHighAccuracy: false,
                maximumAge: 0,
                timeout: 7000
            }
        });
        map.addControl(controls.geolocate);
        
        controls.geolocate.events.register("locationupdated",controls.geolocate,function(e) {
            console.log('location updated');
            var cross = notesLayer.getFeatureById('userCross');
            var circle = notesLayer.getFeatureById('userAccuracy');
            if (cross) {
                notesLayer.removeFeatures(cross);
            };
            if (circle) {
                notesLayer.removeFeatures(circle);
            };
            
            circle = new OpenLayers.Feature.Vector(
                OpenLayers.Geometry.Polygon.createRegularPolygon(
                    new OpenLayers.Geometry.Point(e.point.x, e.point.y),
                    e.position.coords.accuracy/2,
                    40,
                    0
                ),
                {},
                {
                    fillColor: '#000',
                    fillOpacity: 0.1,
                    strokeWidth: 0
                }
            );
            circle.id = 'userAccuracy';
            
            cross = new OpenLayers.Feature.Vector(
                e.point,
                {},
                {
                    graphicName: 'cross',
                    strokeColor: '#f00',
                    strokeWidth: 2,
                    fillOpacity: 0,
                    pointRadius: 10
                }
            );
            cross.id = 'userCross';
            
            notesLayer.addFeatures([cross,circle]);
            
            if (firstGeolocation) {
                firstGeolocation = false;
                // the following will center the map to the user's location
                //~ this.bind = true; 
            }
        });
        controls.geolocate.events.register("locationfailed",this,function() {
            console.log('Location detection failed');
        });
        controls.geolocate.watch = true;
        firstGeolocation = true;
        controls.geolocate.activate();

        controls.selectStops.activate();
        
        return my;
    };
    
    my.update = function (spec) {
        var spec = spec || {};
        
        if (spec.hasOwnProperty('shape_id')) {
            routesLayer.protocol.params.shape_id = spec.shape_id;
            routesLayer.refresh();
        } else {
            routesLayer.refresh();
        }
        if (spec.hasOwnProperty('trip_id')) {
            controls.selectStops.deactivate();
            stopsLayer.protocol.params.trip_id = spec.trip_id;
            stopsLayer.refresh();
            controls.selectStops.activate();
        } else {
            stopsLayer.refresh();
        }
        if (spec.hasOwnProperty('track')) {
            gpxLayer.refresh({url:'gpx/'+spec.track});
        }
    };

    my.readShape = function () {
        var shape = vectorFormat.write(routesLayer.features, true);
        return {shape: shape};
    };
    
    my.readStops = function () {
        var trip_id = stopsLayer.protocol.params.trip_id;
        var stops = vectorFormat.write(stopsLayer.features, true);
        return {trip_id: trip_id,
            stops: stops};
    };
    my.destroySelected = function() {
        stopsLayer.selectedFeatures[0].destroy();
        return;
    };
    
    my.skipHandler = function (i) {
        function skipper() {
            var selectedFeature = stopsLayer.selectedFeatures[0];
            var ordinal = selectedFeature.data.stop_seq;        
            var nextSelected = stopsLayer.getFeaturesByAttribute('stop_seq',ordinal+i)[0];
            
            var current;
            if (controls.selectStops.active) {
                current = controls.selectStops;
            } else if (controls.modifyStops.active) {
                current = controls.modifyStops.selectControl;
            };
            if (nextSelected) {
                current.unselectAll();
                current.select(nextSelected);
                map.setCenter(
                    new OpenLayers.LonLat(nextSelected.geometry.x,
                        nextSelected.geometry.y));
            };
            return false;
        };

        return skipper;
    };

    my.showUserLocation = function (position) {

    };

    my.controls = controls;
    return my;
})(OpenLayers);
