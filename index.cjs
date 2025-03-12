const fs = require('node:fs');
const { XMLParser } = require('fast-xml-parser');

function removeAttributes(xmlObj) {
    const filteredKeys = Object.keys(xmlObj).filter((key) => !key.startsWith('@_'));
    return filteredKeys.reduce((acc, key) => {
        return {
            ...acc,
            [key]: xmlObj[key]
        }
    }, {})
}

/**
 * Transforma o conteúdo lido das tags coordinate do xml em um
 * array de LatLng.
 */
function parseCoordinatesTagContent(str) {
    return str
        .split('\n')
        .map((s) => {
            const [ lng, lat ] = s.trim()
                .split(',')
                .map((latLng) => Number(latLng))
                .slice(0, -1)

            return { lat, lng }
        })
}

/**
 * @param {object} xml
 */
function getPolygonStyles(xml) {
    return xml.StyleMap.reduce((acc, styleMap) => {
        const polygonId = styleMap['@_id'];

        const styles = styleMap.Pair.reduce((acc, styleMap) => {
            const style = xml.Style.find((style) => {
                return style['@_id'] === styleMap.styleUrl.substring(1)
            });

            return {
                ...acc,
                [styleMap.key]: removeAttributes(style),
            }
        }, {});

        return {
            ...acc,
            [polygonId]: styles
        }
    }, {})
}

/**
 * @param {object} xml
 */
function getPolygons(xml) {
    let placemarks = []
    if (xml.Folder) {
        placemarks = xml.Folder.flatMap((folder) => folder.Placemark);
    } else {
        placemarks = xml.Placemark;
    }
    
    const polygons = [];

    for (let i = 0; i < placemarks.length; i++) {
        const placemark = placemarks[i];

        if (!placemark.Polygon) {
            continue;
        }

        polygons.push({
            name: placemark.name,
            style: placemark.styleUrl.substring(1),
            coordinates: parseCoordinatesTagContent(
                placemark
                    .Polygon
                    .outerBoundaryIs
                    .LinearRing
                    .coordinates
            )
        })
    }
    
   return polygons
}

function main(path) {
    const content = fs.readFileSync(path);
    const xml = new XMLParser({ ignoreAttributes: (attr) => attr !== 'id' }).parse(content);

    const root = xml.kml.Document;

    const polygons = getPolygons(root);
    const styles = {}; // getPolygonStyles(root);

    fs.writeFileSync('./out.json', JSON.stringify({
        polygons,
        styles
    }));
}

main('data.kml')