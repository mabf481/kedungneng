import fitz, os
path="daftar.pdf"
doc=fitz.open(path)
page=doc[0]
hits=page.search_for("1234123498762001")
for rect in hits:
    page.add_redact_annot(rect, fill=(1,1,1))
if hits:
    page.apply_redactions()
    doc.save("daftar-fixed.pdf", garbage=4, deflate=True)
    doc.close()
    os.replace("daftar-fixed.pdf", path)
else:
    doc.close()
