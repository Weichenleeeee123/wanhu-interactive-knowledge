from pathlib import Path
from html import escape
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, KeepTogether

root=Path(__file__).resolve().parents[1]
out=root/'submission'/'wanhu-product-plan.pdf'
pdfmetrics.registerFont(TTFont('ZH',r'C:\Windows\Fonts\msyh.ttc'))
pdfmetrics.registerFont(TTFont('ZH-Bold',r'C:\Windows\Fonts\msyhbd.ttc'))
ink=colors.HexColor('#193f40'); teal=colors.HexColor('#2b706b'); orange=colors.HexColor('#df9c50')
body=ParagraphStyle('Body',fontName='ZH',fontSize=10.3,leading=18.1,textColor=ink,spaceAfter=12,wordWrap='CJK')
h2=ParagraphStyle('Page',fontName='ZH-Bold',fontSize=21,leading=31,textColor=ink,spaceAfter=23,wordWrap='CJK')
h3=ParagraphStyle('Section',fontName='ZH-Bold',fontSize=12.2,leading=21,textColor=teal,spaceBefore=5,spaceAfter=7,wordWrap='CJK')
def frame(canvas,doc):
    canvas.setFillColor(colors.HexColor('#faf9f2'));canvas.rect(0,0,A4[0],A4[1],fill=1,stroke=0)
    canvas.setFillColor(ink);canvas.setFont('ZH-Bold',13);canvas.drawString(43,801,'玩乎')
    canvas.setFont('ZH',8);canvas.drawString(85,802,'可交互知识工坊')
    canvas.setStrokeColor(orange);canvas.setLineWidth(2);canvas.line(43,783,83,783)
    canvas.setFillColor(teal);canvas.setFont('ZH',8)
    canvas.drawString(43,31,'知乎黑客松 / 学习工具与知识生产')
    canvas.drawRightString(552,31,f'产品计划书  ·  {doc.page:02d}')
story=[]
for line in (root/'submission/product-plan.md').read_text(encoding='utf-8').splitlines():
    line=line.strip()
    if not line or line.startswith('# '):continue
    if line.startswith('## '):
        if story:story.append(PageBreak())
        story.append(Paragraph(escape(line[3:]),h2))
    elif line.startswith('### '):story.append(Paragraph(escape(line[4:]),h3))
    else:story.append(Paragraph(escape(line),body))
doc=SimpleDocTemplate(str(out),pagesize=A4,rightMargin=43,leftMargin=43,topMargin=81,bottomMargin=55,title='玩乎 · 产品说明与计划书',author='玩乎项目')
doc.build(story,onFirstPage=frame,onLaterPages=frame)
print(out)
