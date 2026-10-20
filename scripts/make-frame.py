# Draws the carved picture frame used around the home page photos (images/frame-silver.webp).
# A rope twist, a band of leaves and a row of pearls, lit from the top left.
# Usage: python scripts/make-frame.py silver   (also: gilt, walnut)
# Needs numpy and Pillow. Every pattern repeats exactly along the 552px edge so the
# CSS border-image can tile it without seams.
import numpy as np
from PIL import Image, ImageFilter
import sys
SS=2                    # supersample
S=720*SS; B=84*SS       # outer size, border width
MID=S-2*B               # 552*SS edge slice, every period must divide 552
y,x=np.mgrid[0:S,0:S].astype(np.float32)
dt,db,dl,dr=y,S-1-y,x,S-1-x
d=np.stack([dt,db,dl,dr]); side=d.argmin(0); v=d.min(0)
u=np.where(side<2,x,y)
t=np.clip(v/B,0,1)
P_BEAD=23*SS; P_ROPE=46*SS

def seg(t,a,b): return (t>=a)&(t<b)
h=np.zeros_like(t)
# outer rounded lip
c,r=.075,.075; m=seg(t,0,.15); h[m]=.55+.4*np.sqrt(np.clip(1-((t[m]-c)/r)**2,0,1))
# groove
m=seg(t,.15,.185); h[m]=.42
# rope band
c,r=.29,.105; m=seg(t,.185,.395)
xx=(t[m]-c)/r
band=.42+.42*np.sqrt(np.clip(1-xx**2,0,1))
twist=np.abs(np.cos(np.pi*(u[m]/P_ROPE*2+xx*.55)))**.7
h[m]=band*(.72+.28*twist)
# fillet
m=seg(t,.395,.45); h[m]=.5
# cove with a fine leaf pattern (shallow repeating ovals)
m=seg(t,.45,.74); c=.595; w=.145
cove=.24+.3*((t[m]-c)/w)**2
leafx=((u[m]%P_ROPE)/P_ROPE-.5)*2; leafy=(t[m]-c)/(w*.62)
leaf=np.clip(1-(leafx**2+leafy**2),0,1)**.6*.2
h[m]=cove+leaf
# bead row
m=seg(t,.74,.87); c=.805
du=(u[m]%P_BEAD)-P_BEAD/2; dv=(t[m]-c)*B; rb=P_BEAD*.30
bead=np.sqrt(np.clip(rb**2-du**2-dv**2,0,None))/rb
h[m]=.36+.3*bead
# inner sight edge sloping into the picture, with a dark lip
m=seg(t,.87,1.01); tt=(t[m]-.87)/.13
h[m]=.62*(1-tt)**1.3+.04
# fine antique wear: tiny ripples that repeat exactly along each side
rng=np.random.default_rng(7)
wear=np.zeros_like(h)
for _ in range(14):
    f=int(rng.integers(20,160)); g=float(rng.uniform(-30,30)); ph=float(rng.uniform(0,6.28))
    wear+=np.cos(2*np.pi*(f*u/MID+g*t)+ph)
h=h+wear/14*.018
h=np.where(v<B,h,0)
# lighting
k=26*SS/ B*6    # height scale
gy,gx=np.gradient(h*k*B/6)
N=np.stack([-gx,-gy,np.ones_like(gx)]); N/=np.linalg.norm(N,axis=0)
L=np.array([-.45,-.55,.70]); L/=np.linalg.norm(L)
ndl=np.clip((N*L[:,None,None]).sum(0),0,1)
H=(L+np.array([0,0,1.]))/np.linalg.norm(L+np.array([0,0,1.]))
spec=np.clip((N*H[:,None,None]).sum(0),0,1)**36
# ambient occlusion from local cavity
hb=np.array(Image.fromarray((h*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3*SS)),dtype=np.float32)/255
ao=np.clip(1-(hb-h)*2.6,0.45,1)*(0.68+0.32*np.clip(h/0.9,0,1))
style=sys.argv[1] if len(sys.argv)>1 else 'silver'
if style=='silver':
    base=np.array([.86,.86,.88]); tarn=np.array([.22,.21,.21]); sp=.6
elif style=='gilt':
    base=np.array([.80,.63,.34]); tarn=np.array([.20,.13,.06]); sp=.6
else: # dark walnut
    base=np.array([.36,.23,.15]); tarn=np.array([.07,.04,.03]); sp=.25
shade=(.34+.78*ndl)*ao
col=base[:,None,None]*shade
col=col*(ao)+tarn[:,None,None]*(1-ao)*.9
col+=spec*sp*ao
col=np.clip(col,0,1)
img=(np.moveaxis(col,0,-1)*255).astype(np.uint8)
im=Image.fromarray(img).resize((S//SS,S//SS),Image.LANCZOS)
im.save(f'frame-{style}.webp',quality=90,method=6)
print('ok',style)
