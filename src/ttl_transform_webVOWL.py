import rdflib
import json
import sys
import os
from rdflib.namespace import RDF, RDFS, OWL, XSD

def iri_short(iri):
    if '#' in iri:
        return iri.split('#')[-1]
    elif '/' in iri:
        return iri.split('/')[-1]
    else:
        return iri

def main(ttl_file, json_file):
    g = rdflib.Graph()
    g.parse(ttl_file, format="turtle")

    # Header
    header = {
        "languages": ["en"],
        "baseIris": [],
        "title": {"en": "Ontology generated from TTL"},
        "iri": "",
        "description": {"en": "Converted from TTL"},
        "other": {}
    }

    # Classes
    classes = []
    class_attrs = []
    class_ids = set()
    literal_counter = 1  # Para IDs únicos de literales

    # Añadir clases OWL
    for s in g.subjects(RDF.type, OWL.Class):
        cid = iri_short(str(s))
        classes.append({"id": cid, "type": "owl:Class"})
        class_attrs.append({
            "iri": str(s),
            "id": cid,
            "label": {"en": cid}
        })
        class_ids.add(cid)

    # Properties
    properties = []
    property_attrs = []
    literal_nodes = {}  # key: (datatype, property), value: id

    for s, p, o in g.triples((None, RDF.type, OWL.ObjectProperty)):
        pid = iri_short(str(s))
        properties.append({"id": pid, "type": "owl:ObjectProperty"})
        attr = {
            "iri": str(s),
            "id": pid,
            "label": {"en": pid}
        }
        for dom in g.objects(s, RDFS.domain):
            attr["domain"] = iri_short(str(dom))
        for ran in g.objects(s, RDFS.range):
            attr["range"] = iri_short(str(ran))
        property_attrs.append(attr)

    for s, p, o in g.triples((None, RDF.type, RDF.Property)):
        if (s, RDF.type, OWL.ObjectProperty) in g:
            continue
        pid = iri_short(str(s))
        properties.append({"id": pid, "type": "owl:DatatypeProperty"})
        attr = {
            "iri": str(s),
            "id": pid,
            "label": {"en": pid}
        }
        for dom in g.objects(s, RDFS.domain):
            attr["domain"] = iri_short(str(dom))
        for ran in g.objects(s, RDFS.range):
            # Crea un nodo literal único para cada propiedad
            literal_id = f"literal_{literal_counter}"
            literal_counter += 1
            literal_nodes[literal_id] = {
                "id": literal_id,
                "type": "rdfs:Literal",
                "datatype": iri_short(str(ran))
            }
            attr["range"] = literal_id
        property_attrs.append(attr)

    # Añadir nodos literales únicos a class y classAttribute
    for literal_id, node in literal_nodes.items():
        classes.append({"id": literal_id, "type": "rdfs:Literal"})
        class_attrs.append({
            "iri": node["datatype"],
            "id": literal_id,
            "label": {"en": node["datatype"]}
        })

    # Build JSON
    data = {
        "_comment": "Created with ttl_to_webvowl_json.py",
        "header": header,
        "namespace": [],
        "class": classes,
        "classAttribute": class_attrs,
        "property": properties,
        "propertyAttribute": property_attrs
    }

    # Crear carpeta si no existe
    output_dir = os.path.join('TFG', 'data')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, os.path.basename(json_file))

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"¡Los datos se han pasado correctamente al formato JSON correcto en '{output_path}'!")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Uso: python ttl_to_webvowl_json.py Estructura.ttl salida.json")
        sys.exit(1)
    main(sys.argv[1], sys.argv[2])