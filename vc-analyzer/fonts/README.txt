Fonts of the VC Analyzer viewer (app.css @font-face). They ship with the viewer, so the page asks no font
server: it looks the same offline and on a company network (T-0069 D7).

  barlow-semi-condensed-{400,500,600,700}-{latin,latin-ext}.woff2
      Barlow Semi Condensed, Google Fonts v16 subsets (latin, latin-ext)
      Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow)
      SIL Open Font License 1.1: OFL-BarlowSemiCondensed.txt

  ibm-plex-mono-{400,500}-{latin,latin-ext}.woff2
      IBM Plex Mono, Google Fonts v20 subsets (latin, latin-ext)
      Copyright 2017 IBM Corp. with Reserved Font Name "Plex"
      SIL Open Font License 1.1: OFL-IBMPlexMono.txt

The files are the ones fonts.googleapis.com served (css2?family=Barlow+Semi+Condensed:wght@400;500;600;700
&family=IBM+Plex+Mono:wght@400;500), unchanged. Characters outside these subsets (arrows, for example) come
from the system fonts named after them in app.css (--font, --mono).
