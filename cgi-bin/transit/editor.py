#!/usr/bin/python

import ormgeneric.ormgeneric as o
import geojson
import json
import os

from collections import defaultdict

import cgi,cgitb
cgitb.enable()


def jsonPrint(data):
    print "Content-Type: application/json\n\n"
    print json.dumps(data,indent=1)

def printRoutesList(db):
    db.query("""SELECT DISTINCT route_id FROM routes""")
    db.select('routes')
    routes = []
    for row in db.select('routes'):
        data = {}
        for k in ['route_id',
            'agency_id',
            'route_short_name',
            'route_long_name',
            'route_desc',
            'route_type',
            'route_color']:
            data.update({k:row[k]})
        routes.append(data)
    jsonPrint(routes)
    return {'success':True}

def printTracksList():
    files = os.listdir('gpx')
    #~ tracks = ['1.gpx']
    tracks = []
    for f in files:
        if f[-4:] == '.gpx':
            tracks.append({'name':f[:-4],'filename':f})
    jsonPrint(tracks)
    return {'success':True}
    
def printTripsList(db,route_id):
    trips = []
    for row in db.select('trips',route_id=route_id):
        trips.append({
            'service_id':row['service_id'],
            'trip_id':row['trip_id'],
            'trip_headsign':row['trip_headsign'],
            'trip_short_name':row['trip_short_name'],
            'direction_id':row['direction_id'],
            'shape_id':row['shape_id']
            })
    jsonPrint(trips)
    return {'success':True}

def printShape(db,shape_id):
    result = db.select('shapes',shape_id=shape_id)
    coordList = [[p['shape_pt_lon'],p['shape_pt_lat']] for p in result]
    feature = geojson.geoJsonLineString(shape_id,coordList,{'type':'Line'})
    resultGeoJson = geojson.geoJsonFeatCollection([feature])
    jsonPrint(resultGeoJson)
    return {'success':True}

def printRouteSchedule(db,route_id):
    result = db.select('frecuencias',route_id=route_id)
    data = {}
    for row in result:
        f = {}
        for k in row.keys():
            if k not in ['route_id','dia']:
                if row[k]:
                    f.update({k:row[k]})
        data.update({row['dia']:f})
    jsonPrint(data)

def printTripStops(db,trip_id):
    features = []
    stopCodes = []
    q = """SELECT * FROM stop_seq WHERE trip_id="{0}" ORDER BY stop_sequence""".format(trip_id)
    db.query(q)
    for row in db.cursor.fetchall():
        stopCodes.append(row['stop_id'])
    
    for i,stop_id in enumerate(stopCodes):
        d = db.select('stops',stop_id=stop_id)[0]
        f = geojson.geoJsonFeature(stop_id,
            d['stop_lon'],
            d['stop_lat'],
            {'stop_id':d['stop_id'],
            'stop_seq':i+1,
            'stop_calle':d['stop_calle'],
            'stop_numero':d['stop_numero'],
            'stop_esquina':d['stop_esquina'],
            'stop_entre':d['stop_entre']})
        features.append(f)
    resultGeoJson = geojson.geoJsonFeatCollection(features)
    jsonPrint(resultGeoJson)
    return {'success':True}

def printRouteServices(db,route_id):
    servicios = {}
    dias = ['lav','sabado','domingo']
    for dia in dias:
        data = []
        for serv in db.select('servicios',route_id=route_id,dia=dia):
            data.append({'desde':serv['desde'],
                'hasta':serv['hasta'],
                'frecuencia':serv['frecuencia']})
        servicios[dia] = data
    jsonPrint(servicios)

def getNewStopId(db):
    q = """SELECT stop_id FROM stops"""
    db.query(q)
    ids = []
    for stop_id in db.cursor.fetchall():
        n = int(stop_id[0][1:])
        ids.append(n)
    newId = 'C'+str(max(ids)+1)
    return newId

def saveStops(db,trip_id,stops_serialized):
    stops = json.loads(stops_serialized)
    db.remove('stop_seq',trip_id=trip_id)
    featureList = stops['features']
    #jsonPrint(stops)
    
    for i,f in enumerate(featureList):
        p = defaultdict(str)
        for k,v in f['properties'].items():
            p[k] = v

        if 'id' in f:
            stop_id = f['id']
            stop_seq = p['stop_seq']
        else:
            stop_id = getNewStopId(db)
            stop_seq = 1000+i

        db.insert('stop_seq',trip_id=trip_id,stop_id=stop_id,stop_sequence=stop_seq)
        
        stop_lon,stop_lat = f['geometry']['coordinates']

        db.insert('stops',stop_id=stop_id,
            stop_lat=stop_lat,
            stop_lon=stop_lon,
            stop_calle = p['stop_calle'],
            stop_entre = p['stop_entre'],
            stop_numero = p['stop_numero']
            )

    jsonPrint({'success':True,'trip_id':trip_id, 'stops':stops})

    return {'success':True}

def saveShape(db,shape_serialized):
    collection = json.loads(shape_serialized)
    shape_id = collection['features']
    for feature in collection['features']:
        if feature['geometry']['type'] == 'LineString':
            coordList = feature['geometry']['coordinates']
            shape_id = feature['id']

    db.remove('shapes',shape_id=shape_id)
    for i,pt in enumerate(coordList):
        db.insert('shapes',shape_id=shape_id,
            shape_pt_lat=pt[1],
            shape_pt_lon=pt[0],
            shape_pt_sequence=i+1)
    
    jsonPrint({'success':True,'shape_id':shape_id})
    
    return

def printStopsWithNoTrip(db):
    db.query("""SELECT DISTINCT stop_id FROM stop_seq""")
    stopsWith = []
    for stop in db.cursor.fetchall():
        stopsWith.append(stop['stop_id'])
    stopsS = set(stopsWith)
    db.query("""SELECT DISTINCT stop_id FROM stops""")
    stopsAv = [stop['stop_id'] for stop in db.cursor.fetchall()]
    stopsAvS = set(stopsAv)
    stopsNoSet = stopsAvS-stopsS
    s = sorted(list(stopsNoSet))
    jsonPrint({'stop_ids':s})
    return

def getBBOX(db,bbox):
    w,s,e,n = map(float,bbox.split(','))
    q = """SELECT * FROM stops
            WHERE (stop_lat BETWEEN {s} AND {n})
            AND (stop_lon BETWEEN {w} AND {e})
            LIMIT 500
            """.format(s=s,n=n,w=w,e=e)
    db.query(q)
    features = []
    for stop in db.cursor.fetchall():
        f = geojson.geoJsonFeature(stop['stop_id'],
            stop['stop_lon'],
            stop['stop_lat'],
            {'stop_id':stop['stop_id'],
            'stop_calle':stop['stop_calle'],
            'stop_numero':stop['stop_numero'],
            'stop_esquina':stop['stop_esquina'],
            'stop_entre':stop['stop_entre']})
        features.append(f)
    resultGeoJson = geojson.geoJsonFeatCollection(features)
    jsonPrint(resultGeoJson)
    #~ jsonPrint({'test':bbox, 'w':w,'s':s,'e':e,'n':n,'query':q})
    return {'success':True}

def requestDispatcher():
    database = form.getvalue('database',"dbRecorridos")
    db = o.dbInterface(database+".sqlite")
    #~ printRouteSchedule(db,route_id='A0')
    action = form.getvalue('action')
    if action == 'bbox':
        bbox = form.getvalue('bbox','')
        getBBOX(db,bbox)
    elif action == 'getRoutes':
        printRoutesList(db)
    elif action == 'getTracks':
        printTracksList();
    elif action == 'getTrips':
        route_id = form.getvalue('route_id')
        printTripsList(db,route_id=route_id)
    elif action == 'getShape':
        shape_id = form.getvalue('shape_id',"")
        printShape(db,shape_id=shape_id)
    elif action == 'getTripStops':
        trip_id = form.getvalue('trip_id',"")
        printTripStops(db,trip_id=trip_id)
    elif action == 'getRouteSchedule':
        route_id = form.getvalue('route_id',"")
        printRouteSchedule(db,route_id=route_id)
    elif action == 'getRouteServices':
        route_id = form.getvalue('route_id',"")
        printRouteServices(db,route_id=route_id)
    elif action == 'saveStops':
        trip_id = form.getvalue('trip_id',"")
        stops_serialized = form.getvalue('stops','')
        saveStops(db,trip_id,stops_serialized)
    elif action == 'saveShape':
        shape_serialized = form.getvalue('shape','')
        saveShape(db,shape_serialized)
    elif action == 'removeShape':
        linea = form.getvalue('linea')
        result = db.remove('shapes',shape_id=linea)
        jsonPrint(result)
    elif action == 'setShape':
        linea = form.getvalue('linea')
        jData = json.loads(form.getvalue('features'))
        for feature in jData['features']:
            if feature['geometry']['type'] == 'LineString':
                coordList = feature['geometry']['coordinates']
        i=1
        db.remove('shapes',shape_id=linea)
        for pt in coordList:
            db.insert('shapes',shape_id=linea,
                shape_pt_lat=pt[1],
                shape_pt_lon=pt[0],
                shape_pt_sequence=i)
            i += 1
        #~ jsonPrint(jData)
        jsonPrint({'success':True})
    elif action == 'getNoTrips':
        printStopsWithNoTrip(db)
    else:
        print "Please give me something to do..."

    db.close()

def test():
    database = "dbRecorridos"
    db = o.dbInterface(database+".sqlite")
    #~ getNewStopId(db)
    printStopsWithNoTrip(db)
    #~ printTripStops(db,'C0.ida')
    db.close()
    
if __name__ == "__main__":
    form = cgi.FieldStorage()
    requestDispatcher()
    #~ test()

