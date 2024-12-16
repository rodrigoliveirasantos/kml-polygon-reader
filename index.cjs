const fs = require('node:fs');
const { XMLParser } = require('fast-xml-parser');

/**
 * Transforma o conteúdo lido das tags coordinate do xml em um
 * array de LatLng.
 */
function parseCoordinatesTagContent(str) {
    return str
        .split('\n')
        .map((s) => {
            const [ lat, lng ] = s.trim()
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
        const styles = styleMap.Pair;
        
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
    const placemarks = xml.Folder.flatMap((folder) => folder.Placemark);
    
    return placemarks.map((placemark) => {
        return {
            name: placemark.name,
            style: placemark.styleUrl.substring(1),
            coordinates: parseCoordinatesTagContent(
                placemark
                    .Polygon
                    .outerBoundaryIs
                    .LinearRing
                    .coordinates
            )
        }
    });
}

function main(path) {
    const content = fs.readFileSync(path);
    const xml = new XMLParser({ ignoreAttributes: false }).parse(content);

    const root = xml.kml.Document;

    const polygons = getPolygons(root);
    const styles = getPolygonStyles(root);

    fs.writeFileSync('./out.json', JSON.stringify({
        polygons,
        styles
    }));
}

main('data.kml')