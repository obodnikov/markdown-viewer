-- Pandoc filter: prepare images for LaTeX, so that one image cannot stop the export.
--
-- SVG images are converted to PDF; otherwise they can reach LaTeX's svg package,
-- which needs Inkscape. An image that cannot be used is replaced with its description
-- and a warning, and the rest of the document still exports.
-- RSVG_CONVERT_PATH names the converter.

local rsvg_convert = os.getenv('RSVG_CONVERT_PATH') or 'rsvg-convert'

local function is_svg(src, mime_type)
  -- Servers can add parameters to the type: image/svg+xml;charset=utf-8
  if mime_type:match('^image/svg%+xml') then
    return true
  end
  return src:lower():match('%.svg$') ~= nil and not mime_type:match('^text/html')
end

local function is_unusable(mime_type)
  -- LaTeX cannot read WebP. Text means a server's error page came instead of the image:
  -- pandoc 3.1 does not treat a 404 response as a failed download.
  return mime_type:match('^text/') ~= nil or mime_type:match('^image/webp') ~= nil
end

local function leave_out(img, warning, label)
  io.stderr:write('[WARNING] ' .. warning .. ': ' .. img.src:sub(1, 80) .. '\n')
  local description = pandoc.utils.stringify(img.caption)
  return pandoc.Emph({pandoc.Str('[' .. label .. ': ' .. description .. ']')})
end

function Image(img)
  local fetched, mime_type, contents = pcall(pandoc.mediabag.fetch, img.src)
  if not fetched or not contents then
    -- pandoc reports an unavailable image itself
    return nil
  end
  mime_type = mime_type or ''

  if is_svg(img.src, mime_type) then
    local converted, pdf = pcall(pandoc.pipe, rsvg_convert, {'-f', 'pdf'}, contents)
    if converted then
      local name = pandoc.utils.sha1(img.src) .. '.pdf'
      pandoc.mediabag.insert(name, 'application/pdf', pdf)
      img.src = name
      return img
    end
    return leave_out(img, 'SVG image not converted', 'SVG image')
  end

  if is_unusable(mime_type) then
    return leave_out(img, 'Image not usable', 'Image')
  end
end
