require 'webrick'

class StringFileHandler < WEBrick::HTTPServlet::AbstractServlet
  ROOT = File.realpath(__dir__)

  MIME_TYPES = {
    '.html' => 'text/html; charset=utf-8',
    '.css' => 'text/css; charset=utf-8',
    '.js' => 'application/javascript; charset=utf-8',
    '.jsx' => 'application/javascript; charset=utf-8',
    '.json' => 'application/json; charset=utf-8',
    '.svg' => 'image/svg+xml',
    '.png' => 'image/png',
    '.jpg' => 'image/jpeg',
    '.jpeg' => 'image/jpeg'
  }

  def do_GET(req, res)
    rel_path = req.path == '/' ? '/index.html' : req.path
    rel_path = rel_path.split('?').first
    full_path = File.expand_path(File.join(ROOT, rel_path))

    public_asset = rel_path == '/index.html' || rel_path.start_with?('/src/', '/public/')
    safe_path = full_path.start_with?(ROOT + File::SEPARATOR) &&
                File.file?(full_path) &&
                File.realpath(full_path).start_with?(ROOT + File::SEPARATOR)
    allowed_type = MIME_TYPES.key?(File.extname(full_path).downcase)

    unless public_asset && safe_path && allowed_type
      res.status = 404
      res.content_type = 'text/plain; charset=utf-8'
      res.body = "Not found: #{req.path}"
      return
    end

    ext = File.extname(full_path).downcase
    res.status = 200
    res.content_type = MIME_TYPES[ext] || 'application/octet-stream'
    # By assigning a String to body, WEBrick uses send_body_string (socket.write)
    # avoiding the sandboxed Errno::EPERM on sendfile / IO.copy_stream
    res.body = File.binread(full_path)
    res['Access-Control-Allow-Origin'] = '*'
    res['Cache-Control'] = 'no-cache, no-store, must-revalidate'
  end
end

server = WEBrick::HTTPServer.new(
  Port: 3034,
  BindAddress: '127.0.0.1',
  Logger: WEBrick::Log.new($stdout),
  AccessLog: [[$stdout, WEBrick::AccessLog::COMBINED_LOG_FORMAT]]
)

server.mount '/', StringFileHandler

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }

server.start
