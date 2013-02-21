#!/usr/bin/env python
# -*- coding: utf-8 -*-
#
#		computeServicios.py
# Este programa calcula la tabla de servicios por franja horaria para 
# la tabla original. No está hecho para ser distribuido y solo debe 
# considerarse un hack para no escribir la tabla a mano a partir de los 
# datos provistos por el municipio

import ormgeneric.ormgeneric as o

def moveRouteShapes(dbOld,dbNew,shape_id,newName):
	for p in dbOld.select('shapes',shape_id=shape_id):
		print 'moving shape from old to new: ', shape_id
		dbNew.insert('shapes',shape_id=newName,
			shape_pt_lat=p['shape_pt_lat'],
			shape_pt_lon=p['shape_pt_lon'],
			shape_pt_sequence=p['shape_pt_sequence'])

def getRoutes(db):
	routes = []
	db.query("""SELECT DISTINCT route_id FROM frecuencias ORDER BY route_id""")
	for row in db.cursor.fetchall():
		routes.append(row['route_id'])
	return routes

def getRouteFrec(db,route_id):
	result = []
	for row in db.select('frecuencias',route_id=route_id):
		dia = row['dia']
		for faja in ['pico','restante','fijo','nocturno','faja1','faja2','faja3']:
			frecuencia = row[faja]
			for hora in getHoras(db,dia,faja):
				if frecuencia:
					#~ print '\t',dia,'\t',hora,frecuencia
					fila = {'dia':dia,'desde':hora['desde'],'hasta':hora['hasta'],
						'frecuencia':frecuencia}
					print fila
					result.append(fila)
	return result

def getHoras(db,dia,faja):
	result = []
	for hora in db.select('fajas',dia=dia,tipo=faja):
		result.append({'desde':hora['desde'],'hasta':hora['hasta']})
	return result


def main():
	storeDb = 'dbRecorridos.sqlite'
	db = o.dbInterface(storeDb)
	for route_id in getRoutes(db):
		print route_id
		for servicio in getRouteFrec(db,route_id):
			db.insert('servicios',
				route_id=route_id,
				dia=servicio['dia'],
				frecuencia=servicio['frecuencia'],
				desde=servicio['desde'],
				hasta=servicio['hasta'])
	db.close()
	
if __name__ == '__main__':
	main()




