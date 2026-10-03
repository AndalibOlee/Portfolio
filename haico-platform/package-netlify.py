"""Build the platform and package it for Netlify (drag-and-drop or CLI deploy).

    python3 package-netlify.py            -> netlify-site/ (index.html, _redirects, netlify.toml) + haico-platform-netlify.zip

Deploy either by dropping netlify-site/ onto https://app.netlify.com/drop, or with
    netlify deploy --prod --dir netlify-site
"""
import os, shutil, subprocess, sys, zipfile
here = os.path.dirname(os.path.abspath(__file__))
os.chdir(here)
subprocess.check_call([sys.executable, "build.py"])
out = "netlify-site"
shutil.rmtree(out, ignore_errors=True)
os.makedirs(out)
shutil.copy("haico-platform.html", os.path.join(out, "index.html"))
open(os.path.join(out, "_redirects"), "w").write("/*    /index.html   200\n")
open(os.path.join(out, "netlify.toml"), "w").write(
    '[build]\n  publish = "."\n\n'
    '[[headers]]\n  for = "/*"\n  [headers.values]\n'
    '    X-Frame-Options = "SAMEORIGIN"\n    X-Content-Type-Options = "nosniff"\n    Referrer-Policy = "strict-origin-when-cross-origin"\n'
    '    Cache-Control = "public, max-age=0, must-revalidate"\n')
zip_name = "haico-platform-netlify.zip"
with zipfile.ZipFile(zip_name, "w", zipfile.ZIP_DEFLATED) as z:
    for fn in os.listdir(out):
        z.write(os.path.join(out, fn), fn)
print(out, "+", zip_name, os.path.getsize(zip_name), "bytes")
