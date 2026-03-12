// ── Room definitions ──────────────────────────────────────────

const FreddyRooms = {
    show_stage:       { label: 'Show Stage',       connections: ['dining_area']                              },
    dining_area:      { label: 'Dining Area',       connections: ['restrooms']                               },
    restrooms:        { label: 'Restrooms',         connections: ['kitchen']                                 },
    kitchen:          { label: 'Kitchen',           connections: ['east_hall']                               },
    east_hall:        { label: 'East Hall',         connections: ['east_hall_corner']                        },
    east_hall_corner: { label: 'East Hall Corner',  connections: []                                          },
};

const BonnieRooms = {
    show_stage:       { label: 'Show Stage',        connections: ['dining_area', 'backstage']                },
    dining_area:      { label: 'Dining Area',        connections: ['backstage', 'west_hall']                 },
    backstage:        { label: 'Backstage',          connections: ['dining_area', 'west_hall']               },
    west_hall:        { label: 'West Hall',          connections: ['dining_area', 'west_hall_corner', 'supply_closet'] },
    supply_closet:    { label: 'Supply Closet',      connections: ['office_left', 'west_hall', 'dining_area'] },
    west_hall_corner: { label: 'West Hall Corner',   connections: ['supply_closet', 'office_left', 'dining_area'] },
    //west_hall_corner: { label: 'West Hall Corner',   connections: [] },

    office_left:      { label: 'Office (Left)',       connections: []                                         },
};

const ChicaRooms = {
    show_stage:       { label: 'Show Stage',        connections: ['dining_area']                             },
    dining_area:      { label: 'Dining Area',        connections: ['restrooms', 'kitchen']                   },
    restrooms:        { label: 'Restrooms',          connections: ['kitchen', 'east_hall']                   },
    //kitchen:          { label: 'Kitchen',            connections: ['restrooms', 'east_hall']                 },
    east_hall:        { label: 'East Hall',          connections: ['dining_area', 'east_hall_corner']        },
    east_hall_corner: { label: 'East Hall Corner',   connections: ['east_hall', 'office_right']                              },
    //east_hall_corner: { label: 'East Hall Corner',   connections: []                              },

    office_right:     { label: 'Office (Right)',      connections: []                                         },
};


// ── Global room map ───────────────────────────────────────────

const ROOMS = {
    show_stage:       { who: ['Freddy',  ,'Bonnie'] },
    dining_area:      { who: [] },
    backstage:        { who: [] },
    kitchen:          { who: ['Chica'] },
    restrooms:        { who: [] },
    east_hall:        { who: [] },
    east_hall_corner: { who: [] },
    west_hall:        { who: [] },
    west_hall_corner: { who: [] },
    supply_closet:    { who: [] },
    pirate_cove:      { who: [] },
    office_left:      { who: [] },
    office_right:     { who: [] },
    office:           { who: [] },
};


// ── Camera system ─────────────────────────────────────────────

const CAM_BASE = '../Assets/Cam_views/';

const CAMS = [
    { id: '1A', label: 'CAM 1A', room: 'show_stage'       },
    { id: '1B', label: 'CAM 1B', room: 'dining_area'      },
    { id: '1C', label: 'CAM 1C', room: 'pirate_cove'      },
    { id: '2A', label: 'CAM 2A', room: 'west_hall'        },
    { id: '2B', label: 'CAM 2B', room: 'west_hall_corner' },
    { id: '3',  label: 'CAM 3',  room: 'backstage'        },
    { id: '6',  label: 'CAM 6',  room: 'kitchen'          },
    { id: '4A', label: 'CAM 4A', room: 'east_hall'        },
    { id: '4B', label: 'CAM 4B', room: 'east_hall_corner' },
    { id: '5',  label: 'CAM 5',  room: 'supply_closet'    },
    { id: '7',  label: 'CAM 7',  room: 'restrooms'        },
];

export { FreddyRooms, BonnieRooms, ChicaRooms, ROOMS, CAM_BASE, CAMS };
