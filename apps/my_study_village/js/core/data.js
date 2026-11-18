/* ==========================================================================
   My Study Village · Static game data
   Subjects, milestones (0 h → 300 h), decorations and colour palettes.
   ========================================================================== */
'use strict';

const STORAGE_KEY = 'my_study_village_v1';

const DEFAULT_SUBJECTS = [
  { id: 'neuro', name: 'Neuroanatomía', color: '#8FA893' },
  { id: 'bioquimica', name: 'Bioquímica Clínica', color: '#7EA8BE' },
  { id: 'farmaco', name: 'Farmacología Clínica', color: '#D198A4' },
  { id: 'derma', name: 'Dermatología', color: '#E2B4BD' },
  { id: 'snc', name: 'Sistema Nervioso', color: '#6E8B74' },
  { id: 'urgencias', name: 'Medicina Intensiva y Urgencias', color: '#C97B63' },
  { id: 'oftalmo', name: 'Oftalmología', color: '#A8C8D8' },
  { id: 'inmuno', name: 'Inmunología y Reumatología', color: '#D4A359' },
  { id: 'deportiva', name: 'Medicina Deportiva', color: '#9AB89E' },
  { id: 'genomica', name: 'Medicina Genómica', color: '#B39EB5' },
  { id: 'general', name: 'Repaso General / MIR', color: '#9E765B' }
];

/*
 * Milestones are placed on an isometric grid (gx, gy) from -6 to 6.
 * Streets run along gx = 0 (main street), gy = 0 (avenue) and gy = -3 (upper avenue);
 * a river crosses the lower part of the island and leaves through a waterfall.
 * The building's front corner sits on the cell centre.
 */
const MILESTONES = [
  {
    id: 'cabin_starter', hours: 0, name: 'Cabaña del Estudiante y Huerto',
    gx: 1, gy: 1, type: 'cabin',
    desc: 'Tu humilde hogar de troncos junto al camino, con un escritorio junto a la ventana y un pequeño huerto de lavanda.',
    villager: { id: 'v_0', defaultName: 'Lucía', role: 'Estudiante de Medicina', color: '#D198A4' }
  },
  {
    id: 'mailbox_path', hours: 0.5, name: 'Buzón de Madera y Sendero',
    gx: 0.62, gy: 1.42, type: 'mailbox',
    desc: 'Los primeros caminos de adoquines, un farol de bienvenida y un buzón para recibir cartas y manuales médicos.',
    villager: null
  },
  {
    id: 'cottage_1', hours: 1, name: 'Casita de Piedra del Vecino',
    gx: -1, gy: 1, type: 'cottage',
    desc: 'Una acogedora casita de piedra con contraventanas verdes y hiedra. Tu primer vecino se muda al valle.',
    villager: { id: 'v_1', defaultName: 'Mateo', role: 'Carpintero del Valle', color: '#7EA8BE' }
  },
  {
    id: 'bridge_pond', hours: 2, name: 'Puente de Madera y Nenúfares',
    gx: 0, gy: 3, type: 'bridge',
    desc: 'Un puente arqueado cruza el río cristalino entre nenúfares, juncos y patos tranquilos.',
    villager: null
  },
  {
    id: 'cafe', hours: 3, name: 'Cafetería "El Grano Dorado"',
    gx: 1, gy: -1, type: 'cafe',
    desc: 'Toldo de rayas, mesitas al aire libre y el mejor café con leche para repasar antes de prácticas.',
    villager: { id: 'v_2', defaultName: 'Clara', role: 'Barista y Lectora', color: '#D4A359' }
  },
  {
    id: 'bakery', hours: 5, name: 'Panadería Artesanal La Espiga',
    gx: 2, gy: -1, type: 'bakery',
    desc: 'Muros de piedra cálida, horno de leña y el aroma a bollos de canela envolviendo las calles.',
    villager: { id: 'v_3', defaultName: 'Don Tomás', role: 'Maestro Panadero', color: '#C97B63' }
  },
  {
    id: 'library', hours: 8, name: 'Biblioteca Municipal y Torre del Reloj',
    gx: -1, gy: -2, type: 'library',
    desc: 'Piedra antigua cubierta de musgo, estanterías de roble hasta el techo y un reloj que marca tus horas de estudio.',
    villager: { id: 'v_4', defaultName: 'Elena', role: 'Bibliotecaria', color: '#8FA893' }
  },
  {
    id: 'florist', hours: 12, name: 'Floristería e Invernadero de Cristal',
    gx: -2, gy: 1, type: 'florist',
    desc: 'Peonías, rosas inglesas y helechos bajo un invernadero de cristal bañado por el sol.',
    villager: { id: 'v_5', defaultName: 'Sofía', role: 'Botánica', color: '#E2B4BD' }
  },
  {
    id: 'fountain_gazebo', hours: 15, name: 'Fuente Central de Piedra',
    gx: -1, gy: -1, type: 'gazebo',
    desc: 'El corazón del pueblo: una fuente de piedra con musgo donde suenan melodías suaves al atardecer.',
    villager: null
  },
  {
    id: 'town_square', hours: 18, name: 'Plaza Mayor y Puestos de Mercado',
    gx: 1, gy: -2, type: 'square',
    desc: 'Suelo adoquinado, banderines festivos y puestos con fruta fresca, miel y cuadernos.',
    villager: { id: 'v_6', defaultName: 'Hugo', role: 'Mercader de Libros', color: '#9E765B' }
  },
  {
    id: 'bookshop', hours: 22, name: 'Librería Antigua y Papelería',
    gx: 2, gy: 1, type: 'bookshop',
    desc: 'Atlas anatómicos antiguos, plumas estilográficas y libretas cosidas a mano tras un escaparate de ladrillo.',
    villager: { id: 'v_7', defaultName: 'Valeria', role: 'Librera', color: '#B39EB5' }
  },
  {
    id: 'school', hours: 25, name: 'Escuela del Pueblo',
    gx: -3, gy: -1, type: 'school',
    desc: 'Edificio de ladrillo cálido con campanario y pizarra donde se fomenta la curiosidad.',
    villager: { id: 'v_8', defaultName: 'Prof. Álvaro', role: 'Maestro', color: '#6E8B74' }
  },
  {
    id: 'windmill', hours: 30, name: 'Molino de Piedra junto al Río',
    gx: 4, gy: 1, type: 'windmill',
    desc: 'Sus aspas giran pausadamente con la brisa del valle, moliendo grano para la panadería.',
    villager: null
  },
  {
    id: 'botanical_park', hours: 35, name: 'Parque Botánico de los Cerezos',
    gx: -1, gy: 5, type: 'park',
    desc: 'Senderos bordeados de cerezos en flor, bancos de madera y mariposas al otro lado del río.',
    villager: { id: 'v_9', defaultName: 'Noa', role: 'Jardinera', color: '#D198A4' }
  },
  {
    id: 'apothecary', hours: 42, name: 'Botica Histórica y Jardín Medicinal',
    gx: 3, gy: -1, type: 'apothecary',
    desc: 'Frascos de boticario, morteros de porcelana y cultivo de digitalis, sauce y manzanilla.',
    villager: { id: 'v_10', defaultName: 'Dra. Beatriz', role: 'Boticaria', color: '#7EA8BE' }
  },
  {
    id: 'hospital', hours: 50, name: 'Hospital Universitario del Pueblo',
    gx: 0, gy: -5, type: 'hospital',
    desc: '¡Gran hito médico! Un hospital luminoso al final de la calle mayor, con tejado verde salvia y ambulancia vintage.',
    villager: { id: 'v_11', defaultName: 'Dr. Nicolás', role: 'Jefe de Guardia', color: '#8FA893' }
  },
  {
    id: 'observatory', hours: 62, name: 'Observatorio Astronómico de la Colina',
    gx: -4, gy: -4, type: 'observatory',
    desc: 'Cúpula de cobre desde donde contemplar las estrellas tras las noches de estudio intenso.',
    villager: { id: 'v_12', defaultName: 'Martín', role: 'Astrónomo', color: '#7EA8BE' }
  },
  {
    id: 'train_station', hours: 75, name: 'Estación de Tren "Valle Verde"',
    gx: 5, gy: 0, type: 'station',
    desc: 'Andén de madera tallada, reloj de estación y un tren de vapor pastel que recorre el borde de la isla.',
    villager: { id: 'v_13', defaultName: 'Gabriel', role: 'Jefe de Estación', color: '#D4A359' }
  },
  {
    id: 'theater', hours: 90, name: 'Teatro y Casa de la Cultura',
    gx: -3, gy: 4, type: 'theater',
    desc: 'Fachada neoclásica pastel donde se celebran conciertos de cámara y conferencias.',
    villager: { id: 'v_14', defaultName: 'Carmen', role: 'Violinista', color: '#E2B4BD' }
  },
  {
    id: 'royal_greenhouse', hours: 110, name: 'Gran Invernadero Real y Rosaleda',
    gx: 2, gy: 4, type: 'greenhouse',
    desc: 'Arquitectura de hierro forjado y cristal con especies exóticas de todo el mundo.',
    villager: null
  },
  {
    id: 'med_faculty', hours: 135, name: 'Facultad de Medicina e Investigación',
    gx: 3, gy: -3, type: 'faculty',
    desc: 'Aulas magnas de piedra, laboratorios de genómica e inmunología y claustro universitario.',
    villager: { id: 'v_15', defaultName: 'Dra. Irene', role: 'Catedrática', color: '#6E8B74' }
  },
  {
    id: 'lighthouse', hours: 165, name: 'Faro del Acantilado',
    gx: 4, gy: 5, type: 'lighthouse',
    desc: 'Guía a los globos y a las aves al anochecer con su luz cálida desde el borde de la isla.',
    villager: { id: 'v_16', defaultName: 'Samuel', role: 'Farero', color: '#A8C8D8' }
  },
  {
    id: 'town_hall_castle', hours: 200, name: 'Ayuntamiento Histórico y Torreón',
    gx: -5, gy: 0, type: 'castle',
    desc: 'Majestuoso edificio cívico de piedra con torreón empizarrado al final de la avenida.',
    villager: { id: 'v_17', defaultName: 'Leonor', role: 'Alcaldesa', color: '#D4A359' }
  },
  {
    id: 'cathedral_books', hours: 250, name: 'Gran Ateneo de la Sabiduría',
    gx: -2, gy: -4, type: 'cathedral',
    desc: 'Monumento dorado al esfuerzo intelectual, con cúpula luminosa y claustro de mármol crema.',
    villager: null
  },
  {
    id: 'university_city', hours: 300, name: 'Ciudad Universitaria Floreciente',
    gx: 2, gy: -5, type: 'wonder',
    desc: '¡Esplendor máximo! Globos aerostáticos surcan el cielo celebrando tus 300 horas de vocación médica.',
    villager: { id: 'v_18', defaultName: 'Hipócrates', role: 'Sabio Honorario', color: '#D4A359' }
  }
];

const SPECIAL_DECORATIONS = [
  { id: 'deco_lanterns', name: 'Farolas de Forja', hours: 1.5, icon: '🏮', desc: 'Iluminan cálidamente los cruces de caminos al atardecer.' },
  { id: 'deco_dogs', name: 'Perritos Callejeros', hours: 2, icon: '🐶', desc: 'Perritos juguetones que pasean, se sientan y duermen la siesta por el pueblo.' },
  { id: 'deco_cats', name: 'Gatitos Dormilones', hours: 4, icon: '🐱', desc: 'Gatitos acurrucados junto a la cafetería y la cabaña.' },
  { id: 'deco_ducks', name: 'Familia de Patos', hours: 6, icon: '🦆', desc: 'Mamá pata y sus patitos nadando río arriba y río abajo.' },
  { id: 'deco_bunting', name: 'Banderines Festivos', hours: 16, icon: '🎏', desc: 'Guirnaldas de colores suaves sobre la plaza del mercado.' },
  { id: 'deco_fireflies', name: 'Luciérnagas Nocturnas', hours: 28, icon: '✨', desc: 'Destellos dorados flotando sobre los jardines durante la noche.' },
  { id: 'deco_balloons', name: 'Globos Aerostáticos', hours: 60, icon: '🎈', desc: 'Globos pastel cruzando lentamente el horizonte.' }
];

/* Façade & roof palettes for each architectural style */
const ARCHITECTURAL_PALETTES = {
  cottagecore: {
    plaster: '#FBF3E2', plasterShade: '#E6D7BC',
    stone: '#BDB4A6', stoneShade: '#9E9487',
    roof: '#CB7A5C', roofDark: '#A85C43',
    roofAlt: '#7FA37A', roofAltDark: '#5F825A',
    trim: '#7A5134', door: '#8A5A3B', shutter: '#7FA37A', accent: '#F1A7B5'
  },
  alpine: {
    plaster: '#EAD5B3', plasterShade: '#D2B893',
    stone: '#ABA59C', stoneShade: '#8B857D',
    roof: '#6E4C36', roofDark: '#4F3525',
    roofAlt: '#5B7B62', roofAltDark: '#445E4A',
    trim: '#4A2E1B', door: '#5A3A24', shutter: '#B5533C', accent: '#F4BC4C'
  },
  mediterranean: {
    plaster: '#FFFDF8', plasterShade: '#ECE5D6',
    stone: '#DCCBAC', stoneShade: '#C0AF90',
    roof: '#DB8462', roofDark: '#B76442',
    roofAlt: '#6FA6C4', roofAltDark: '#4F86A4',
    trim: '#4F86A4', door: '#4F86A4', shutter: '#6FA6C4', accent: '#F4BC4C'
  },
  fairytale: {
    plaster: '#FCEFF3', plasterShade: '#EAD6DE',
    stone: '#C6B8C0', stoneShade: '#A898A3',
    roof: '#D98FA3', roofDark: '#B76F83',
    roofAlt: '#8EBBA6', roofAltDark: '#6E9A86',
    trim: '#8A6070', door: '#8EBBA6', shutter: '#C8B5E5', accent: '#F4BC4C'
  }
};

/* Seasonal ground, water, foliage & sky colours */
const SEASON_PALETTES = {
  spring: {
    grass: '#9DCB7F', grassLight: '#B5DA92', grassDark: '#80B068', tuft: '#6EA35A',
    flowers: ['#FFFFFF', '#FFE27A', '#F7A8C0', '#C9B6E4', '#FFB38A', '#FFFFFF'],
    water: '#7EC8DE', waterDeep: '#5AAFCB', waterLight: '#C4EAF3', bank: '#D2BE92',
    foliage: ['#7DB86A', '#92C877', '#69A65B'], blossom: ['#F8C4D3', '#F2A9BE', '#FCDCE6'],
    pine: ['#5E9A6A', '#4E8A5C'], fruit: '#F07B6B',
    skyTop: '#BFE3F2', skyBottom: '#FFF2DE', snow: false
  },
  summer: {
    grass: '#88BF6B', grassLight: '#9DD07B', grassDark: '#6CA555', tuft: '#5C9447',
    flowers: ['#FFFFFF', '#FFD54F', '#FF9EB5', '#9FC7FF', '#FF8A65', '#FFF59D'],
    water: '#6CBCD6', waterDeep: '#4AA0BF', waterLight: '#B8E4EF', bank: '#C9B07F',
    foliage: ['#5FA352', '#74B663', '#4F9046'], blossom: ['#74B663', '#86C474', '#5FA352'],
    pine: ['#4F8E5C', '#417C4E'], fruit: '#F05E4F',
    skyTop: '#A9DBF0', skyBottom: '#FFF4DA', snow: false
  },
  autumn: {
    grass: '#BAB670', grassLight: '#CBC47E', grassDark: '#9D9B58', tuft: '#8C8A4B',
    flowers: ['#F4BC4C', '#E07A4F', '#FFFFFF', '#C9785B'],
    water: '#80B5C3', waterDeep: '#5F99A9', waterLight: '#BEDCE3', bank: '#B89F75',
    foliage: ['#E2964A', '#D36A40', '#EDB64F'], blossom: ['#E89A5A', '#D97A45', '#F0B860'],
    pine: ['#5A8A5E', '#4A7850'], fruit: '#E8A23C',
    skyTop: '#EBD8C2', skyBottom: '#FCEBD4', snow: false
  },
  winter: {
    grass: '#EDF3F4', grassLight: '#FFFFFF', grassDark: '#D3E0E5', tuft: '#C2D2D8',
    flowers: ['#FFFFFF', '#E3EEF2'],
    water: '#9CC6D6', waterDeep: '#7AAFC4', waterLight: '#E5F4F8', bank: '#CBD5D8',
    foliage: ['#6E9A80', '#5F8C74', '#7FA88E'], blossom: ['#E8EEF0', '#DCE5E8', '#F4F7F8'],
    pine: ['#4F7E66', '#426E58'], fruit: '#E8545A',
    skyTop: '#C9DDEA', skyBottom: '#F4F7FA', snow: true
  }
};

