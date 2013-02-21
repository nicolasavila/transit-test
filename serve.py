#!/usr/bin/env python

import BaseHTTPServer
import CGIHTTPServer
import cgitb; cgitb.enable()  ## This line enables CGI error reporting

PORT = 8003
server = BaseHTTPServer.HTTPServer
handler = CGIHTTPServer.CGIHTTPRequestHandler
server_address = ("", PORT)
handler.cgi_directories = ["/cgi-bin","/cgi-bin/transit"]
print('serving to port '+str(PORT))
httpd = server(server_address, handler)
httpd.serve_forever()

