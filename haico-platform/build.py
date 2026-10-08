import json, sys, os, base64
args = sys.argv[1:]
extra = []; out = 'haico-platform.html'
while args:
    a = args.pop(0)
    if a == '--extra': extra.append(args.pop(0))
    elif a == '--out': out = args.pop(0)
seed=open('seed.json').read().replace('</script','<\\/script')
imgs={}
if os.path.isdir('howto'):
    for fn in sorted(os.listdir('howto')):
        if fn.endswith('.jpg'): imgs[fn[:-4]]='data:image/jpeg;base64,'+base64.b64encode(open('howto/'+fn,'rb').read()).decode()
parts=[open('src/head.html').read(), '<div id="app"></div>\n<script id="seed" type="application/json">'+seed+'</script>\n<script id="howto-img" type="application/json">'+json.dumps(imgs)+'</script>\n']
FILES = ['core','core-people','ui','views-me','views-ops','views-fin','views-misc','views-requests','views-people','views-home','export'] + [f for f in ['views-fin2','views-inv','views-proj','views-hr2','views-team','views-ap','views-shell','views-hr3','views-fin3','views-contracts','views-rules','views-rbp','views-docs','views-apfiles','views-hiring','views-projreq','views-rc-core','views-rc-ui','views-rc-time','views-rc-demo','views-fb1','views-mail','views-xm-core','views-xm-lib','views-xm-admin','views-tsearch','views-cr'] if os.path.exists(f'src/{f}.js')] + ['app']
for f in FILES:
    parts.append('<script>\n'+open(f'src/{f}.js').read()+'\n</script>\n')
for f in extra:
    parts.insert(len(parts)-1, '<script>\n'+open(f).read()+'\n</script>\n')
open(out,'w').write(''.join(parts))
print(out, len(''.join(parts)))
