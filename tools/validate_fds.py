# Validates docs/fds/*.xml against the genuine FCD v3.3 schemas (competition.xsd types).
# Usage: python3 tools/validate_fds.py <path-to-fcd/xsd-dir>
#
# The FCD package is FIFA-copyright material and is NOT bundled with this repo; point the
# tool at your own copy. Two local adaptations, both semantics-preserving and documented:
#  1. A harness.xsd is written beside the schemas declaring the two roots our export uses
#     (Match, MatchData) typed by the real fc:MatchType.
#  2. registration.xsd's FIFAIdentifier pattern ships as "^[...]$". The XSD regex dialect
#     has no anchors (patterns are implicitly full-match) and libxml2 reads ^/$ literally,
#     which makes EVERY value fail. The tool validates against a temp copy with the two
#     anchor characters removed; every other facet is enforced exactly as shipped.
import pathlib, shutil, sys, tempfile
from lxml import etree
src = pathlib.Path(sys.argv[1])
work = pathlib.Path(tempfile.mkdtemp(prefix="fcd-xsd-"))
for f in src.glob("*.xsd"): shutil.copy(f, work / f.name)
for f in (src / "includes").glob("*.xsd"):
    (work / "includes").mkdir(exist_ok=True); shutil.copy(f, work / "includes" / f.name)
reg = work / "registration.xsd"; t = reg.read_text()
t = t.replace('value="^[0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ]{6}[0123456789ABCDEFGHIJKLMNPQRSTU]$"',
              'value="[0123456789ABCDEFGHIJKLMNPQRSTUVWXYZ]{6}[0123456789ABCDEFGHIJKLMNPQRSTU]"')
reg.write_text(t)
(work / "xmlmime.xsd").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" targetNamespace="http://www.w3.org/2005/05/xmlmime"><xsd:simpleType name="base64Binary"><xsd:restriction base="xsd:base64Binary"/></xsd:simpleType><xsd:simpleType name="hexBinary"><xsd:restriction base="xsd:hexBinary"/></xsd:simpleType></xsd:schema>\n')
(work / "harness.xsd").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:fc="http://fifa.com/fc" targetNamespace="http://fifa.com/fc" elementFormDefault="qualified" attributeFormDefault="unqualified">\n<xsd:import namespace="http://www.w3.org/2005/05/xmlmime" schemaLocation="xmlmime.xsd"/>\n<xsd:include schemaLocation="competition.xsd"/>\n<xsd:element name="Match" type="fc:MatchType"/>\n<xsd:element name="MatchData"><xsd:complexType><xsd:sequence><xsd:element ref="fc:Match" maxOccurs="unbounded"/></xsd:sequence><xsd:attribute name="ExportDate" type="fc:DateTime"/><xsd:attribute name="Synthetic" type="xsd:string"/><xsd:attribute name="Standard" type="xsd:string"/></xsd:complexType></xsd:element>\n</xsd:schema>\n')
schema = etree.XMLSchema(etree.parse(str(work / "harness.xsd")))
docs = pathlib.Path(__file__).resolve().parents[1] / "docs" / "fds"
ok = True
for f in sorted(docs.glob("*.xml")):
    valid = schema.validate(etree.parse(str(f)))
    print(f.name, "VALID" if valid else "INVALID")
    if not valid:
        ok = False
        for e in list(schema.error_log)[:5]: print("  ", e)
        print("   total errors:", len(schema.error_log))
sys.exit(0 if ok else 1)
