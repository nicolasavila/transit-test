#!/usr/bin/python

import cgi
import cgitb
cgitb.enable()

import sys,os

form = cgi.FieldStorage()
bbox = form.getfirst('bbox','empty')


print "Content-type: text/html" 
print 
print "<html><head><title>Situation snapshot</title></head><body><p>" 
print "Running:" 
print "<b>Python %s</b><br><br>" %(sys.version) 
print "Environmental variables:<br>" 
print "<ul>" 
for k in sorted(os.environ): 
	print "<li><b>%s:</b>\t\t%s<br>" %(cgi.escape(k), cgi.escape(os.environ[k])) 

print "Hello World"

file = open('./textfile.txt','r')
content = file.readlines()
for line in content:
	print line + '<br>'
	print 

print "</ul></p></body></html>" 
