export type Location = {
  name: string;
  imageAlt: string;
  sketchColumn: 0 | 1 | 2;
  sketchRow: 0 | 1 | 2;
};

// The illustration contains a different landmark in each of its nine cells.
export const LOCATIONS: Location[] = [
  { name: "Delhi", imageAlt: "Light sketch of India Gate", sketchColumn: 0, sketchRow: 0 },
  { name: "Gurgaon", imageAlt: "Light sketch of Cyber City towers", sketchColumn: 1, sketchRow: 0 },
  { name: "Noida", imageAlt: "Light sketch of the metro and city skyline", sketchColumn: 2, sketchRow: 0 },
  { name: "Faridabad", imageAlt: "Light sketch of the Surajkund stepped reservoir", sketchColumn: 0, sketchRow: 1 },
  { name: "Ghaziabad", imageAlt: "Light sketch of the Jawahar Gate clock tower", sketchColumn: 1, sketchRow: 1 },
  { name: "Mumbai", imageAlt: "Light sketch of the Gateway of India", sketchColumn: 2, sketchRow: 1 },
  { name: "Navi Mumbai", imageAlt: "Light sketch of the domed municipal corporation building", sketchColumn: 0, sketchRow: 2 },
  { name: "Thane", imageAlt: "Light sketch of Upvan Lake and the hills", sketchColumn: 1, sketchRow: 2 },
  { name: "Pune", imageAlt: "Light sketch of the Shaniwar Wada entrance", sketchColumn: 2, sketchRow: 2 },
];
