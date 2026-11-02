import http.server
import socketserver
import sys

PORT = 8080
Handler = http.server.SimpleHTTPRequestHandler

try:
    with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"Server successfully started at http://localhost:{PORT}", flush=True)
        sys.stdout.flush()
        httpd.serve_forever()
except Exception as e:
    print(f"Error starting server on port {PORT}: {e}", flush=True)
    # Try fallback port 3000
    try:
        with socketserver.TCPServer(("0.0.0.0", 3000), Handler) as httpd:
            print(f"Server successfully started at http://localhost:3000", flush=True)
            sys.stdout.flush()
            httpd.serve_forever()
    except Exception as e2:
        print(f"Error starting server on port 3000: {e2}", flush=True)

