#!/usr/bin/python

import ormgeneric.ormgeneric as o
import saxosmsql.saxosmsql as s
import geojson
import json
import csv

import cgi,cgitb
cgitb.enable()

form = cgi.FieldStorage()
term = form.getvalue('term')
action = form.getvalue('action')
trip = form.getvalue('trip','')


db = o.dbInterface("dbRecorridos.sqlite")

def getStops(db):
	stops = []
	features = []
	for stopCode in db.select('recorridos',nombre=trip):
		stop = db.select('paradas',codigoparada=stopCode['CodigoParada'])[0]
		stopD = dict(stop)
		stops.append(stopD)
		feature = geojson.geoJsonFeature(stopD['CodigoParada'],stopD['lon'],stopD['lat'],stopD)
		features.append(feature)
	jsonPrint(geojson.geoJsonFeatCollection(features))
	#~ jsonPrint(stops)

def jsonPrint(data):
	print "Content-Type: application/json\n"
	print json.dumps(data,indent=1)

def main():
	if action == 'getStops':
		getStops(db)

	db.close()
if __name__ == "__main__":
	main()
