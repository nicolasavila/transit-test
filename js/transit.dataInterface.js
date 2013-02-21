var transit = transit || {};
var $ = $ || {};

transit.dataInterface = (function ($) {
    'use strict';
    var my = {},
        config = {
            database: 'dbRecorridos',
            cgiUrl: ''
        };

    my.init = function (cgiUrl) {
        config.cgiUrl = cgiUrl;
    };

    function ajax(params, successHandler) {
        $.extend(params, {'database': config.database});
        $.ajax({
            type: 'POST',
            dataType: 'json',
            data: params,
            url: config.cgiUrl,
            success: successHandler,
            statusCode: {
                404: function () {
                    //~ $("#response").html('Could not contact server.');
                    console.log('transit.js error: Could not contact server.');
                },
                500: function () {
                    //~ $("#response").html('A server-side error has occurred.');
                    console.log('transit.js error: A server-side error has occurred.');
                }
            },
            error: function (xhr, ajaxOptions, thrownError) {
                console.log(xhr);
                console.log(ajaxOptions);
                console.log(thrownError);
            }
        });
        return transit.dataInterface;
    }

    my.getRoutes = function (successHandler) {
        ajax({action: 'getRoutes'}, successHandler);
        return this;
    };

    my.getTracks = function (successHandler) {
        ajax({action: 'getTracks'}, successHandler);
        return this;
    };

    my.getTrips = function (route_id, successHandler) {
        ajax({action: 'getTrips', route_id: route_id},
            successHandler);
        return this;
    };

    my.getTripStops = function (trip_id, successHandler) {
        ajax({action: 'getTripStops', trip_id: trip_id},
            successHandler);
        return this;
    };

    my.getSchedule = function (route_id, successHandler) {
        ajax({action: 'getRouteSchedule', route_id: route_id},
            successHandler);
        return this;
    };

    my.getServices = function (route_id, successHandler) {
        ajax({action: 'getRouteServices', route_id: route_id},
            successHandler);
        return this;
    };

    my.saveStops = function (trip_id, stops, successHandler) {
        ajax({action: 'saveStops', trip_id: trip_id, stops: stops},
            successHandler);
        return this;
    };

    my.saveShape = function (shape, successHandler) {
        ajax({action: 'saveShape', shape: shape},
            successHandler);
        return this;
    };

    return my;

}($));



