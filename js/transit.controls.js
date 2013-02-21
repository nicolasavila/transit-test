var transit = transit || {};

transit.controls = (function ($) {
    'use strict';

    var my = {},
        config = {
            routesDiv: 'routesSelect',
            tripsDiv: 'tripsSelect',
            stopsDiv: 'stopsTable',
            tracksDiv: 'tracksSelect',
            scheduleDiv: 'tripsSelect',
            layersDiv: 'capas'
        };

    function populateTracks() {
        var options = $('select#' + config.tracksDiv);

        function fillValues(values) {
            options
                .empty()
                .append($('<option />').val('').text('Select an option'));
            $.each(values, function () {
                options.append($('<option />')
                    .val(this.filename)
                    .text(this.name));
            });
        }
        transit.dataInterface.getTracks(fillValues);

        return transit.controls;
    };

    function populateRoutes() {
        var options = $('select#' + config.routesDiv);
        
        function fillValues(values) {
            options
                .empty()
                .append($('<option />').val('none').text('Select an option'));
            $.each(values, function() {
                options.append($('<option />')
                    .val(this.route_id)
                    .text(this.route_id));
            });
        };
        transit.dataInterface.getRoutes(fillValues);

        return this;
    };

    function populateTrips(route_id) {
        var options = $('select#' + config.tripsDiv);
        function fillValues(values) {
            options
                .empty()
                .append($('<option />').val('none').text('Select an option'));
            $.each(values, function() {
                options.append($('<option />')
                    .val(this.trip_id)
                    .text('Hacia ' + this.trip_headsign)
                    .attr('trip_id', this.trip_id));
            });
        };
        transit.dataInterface.getTrips(route_id, fillValues);
        return this;
    };

    function setupButtons() {
        $('select#' + config.routesDiv).change(function () {
            var route_id = $(this).find(':selected')[0].value;
            transit.maps.update({route_id:route_id,shape_id:'',trip_id:''});
            populateTrips(route_id);
            renderServices(route_id);
        });
        
        $('select#' + config.tripsDiv).change(function () {
            var selected = $(this).find(':selected')[0];
            var trip_id = $(selected).attr('trip_id');
            transit.maps.update({shape_id:trip_id, trip_id:trip_id});
        });

        $('select#' + config.tracksDiv).change(function () {
            var selected = $(this).find(':selected')[0];
            var track = $(selected).val();
            console.log(track);
            transit.maps.update({track:track});
        });
        
        function saveStops() {
            var readStops = transit.maps.readStops();
            // TODO trip_id <> shape_id in general
            transit.dataInterface.saveStops(readStops.trip_id, 
                readStops.stops, 
                function(response){
                    //~ console.log(response);
                    transit.maps.update();
                }
            );
        };
        
        $('#prevStop').click(transit.maps.skipHandler(-1));
        $('#nextStop').click(transit.maps.skipHandler(1));

        $('#editShape').click(function(e){
            e.preventDefault();
            var $this = $(this);
            var trip_id;
            if ($this[0].innerHTML == 'Edit') {
                $this.addClass('btn-primary');
                transit.maps.controls.selectStops.deactivate();
                transit.maps.controls.modifyShape.activate();
                $this[0].innerText = 'Save';
            } else {
                $this[0].innerText = 'Edit';
                $this.removeClass('btn-primary');
                transit.maps.controls.modifyShape.deactivate();
                transit.maps.controls.selectStops.activate();
                var readShape = transit.maps.readShape();
                transit.dataInterface.saveShape(readShape.shape,function(response) {
                    console.log(response);
                });
            };
        });

        $('#editStops').click(function(e){
            e.preventDefault();
            var $this = $(this);
            var trip_id;
            if ($this[0].innerHTML == 'Edit stops') {
                $this.addClass('btn-primary');
                $this[0].innerText = 'Save changes';
                transit.maps.controls.selectStops.deactivate();
                transit.maps.controls.modifyStops.activate();
            } else {
                $this[0].innerText = 'Edit stops';
                $this.removeClass('btn-primary');
                transit.maps.controls.modifyStops.deactivate();
                transit.maps.controls.selectStops.activate();
                saveStops();
            };
        });

        $('#drawStops').click(function(e){
            e.preventDefault();
            var $this = $(this);
            var trip_id;
            if ($this[0].innerHTML == 'Draw stops') {
                $this.addClass('btn-primary');
                $this[0].innerText = 'End drawing';
                transit.maps.controls.selectStops.deactivate();
                transit.maps.controls.drawStops.activate();
            } else {
                $this[0].innerText = 'Draw stops';
                $this.removeClass('btn-primary');
                transit.maps.controls.drawStops.deactivate();
                transit.maps.controls.selectStops.activate();
                saveStops();
            };
        });
        
        $('#removeStop').click(function(e) {
            e.preventDefault();
            transit.maps.destroySelected();
            saveStops();
        });
        
        return this;
    };

    function populateSchedule(route_id) {
        fillSchedule = function(result) {
            function renderHorario(tab, horarios) {
                // here tab and horarios get caught in the closure at the
                // return of renderHorario, so their values are kept each
                // time the loop runs
                return function() {
                    var items = ['pico', 'restante', 'nocturno', 'fijo'];
                    var par;
                    $('#' + tab).empty();
                    for (var k in items) {
                        if (horarios[items[k]]) {
                            par = $('<p>',
                                {text: 'Horario ' + items[k] + ': ' +
                                    horarios[items[k]]});
                            $('#' + tab).append(par);
                        }
                    }
                }
            };
            for (var k in result) {
                renderHorario(k, result[k])();
            }
        };
        transit.dataInterface.getSchedule(route_id, fillSchedule);
    };

    function renderServices(route_id) {
        var fillSchedule = function(result) {
            function renderHorario(tab,horarios) {
                return function() {
                    var par;
                    $('#' + tab).empty();
                    for (var k in horarios) {
                        par = $('<p>',
                            {text:
                            'Desde: ' + horarios[k]['desde'] +
                            '     Hasta: ' + horarios[k]['hasta'] +
                            '     Cada ' + horarios[k]['frecuencia'] + ' minutos.'});
                        $('#' + tab).append(par);
                    }
                }
            };
            for (var k in result) {
                renderHorario(k, result[k])();
            }
        };
        transit.dataInterface.getServices(route_id, fillSchedule);
    };

    function renderStopsTable(trip_id) {
        var stopsTemplate = Handlebars.compile($('#stopsTemplate').html());
        var stopsRenderer = function(data) {
            $('#'+transit.controlsModule.config.stopsDiv).empty().append(stopsTemplate(data));
            $('#'+transit.controlsModule.config.stopsDiv+' table tr').on('hover',function(){
                //~ console.log('test handler');
            });
        };
        transit.dataInterface.getTripStops(trip_id,stopsRenderer);
    };
    
    function renderStopInfo(evt) {
        console.log(evt);
        var stopTemplate = Handlebars.compile($('#stopInfoTmp').html());
        var selectedFeature = evt.feature;
        //~ var selectedFeature = transit.maps.stopsLayer.selectedFeatures[0];
        var stopInfoDiv = $('#stopInfoHandlebars');
        stopInfoDiv.empty();
        if (selectedFeature) {
            var at = selectedFeature.attributes;
            stopInfoDiv.append(stopTemplate(selectedFeature));
        };
        
    };
    
    function bindLayerControls() {
        $('#' + config.layersDiv + ' :checkbox').click(function() {
                var layerId = $(this)[0].value;
                if ($(this).is(':checked')) {
                    transit.maps.map.getLayer(layerId).setVisibility(true);
                } else {
                    transit.maps.map.getLayer(layerId).setVisibility(false);
                }
            }
        );
    };

    my.init = function () {
        populateTracks();
        populateRoutes();
        setupButtons();
        //~ bindLayerControls();
    };
    my.renderStopInfo = renderStopInfo;
    
    return my;
})($);
