export const sampleHospitals = [
  {
    name: 'Zuckerberg San Francisco General Hospital and Trauma Center',
    address: '1001 Potrero Ave, San Francisco, CA 94110',
    phone: '(628) 206-8000',
    latitude: 37.7557,
    longitude: -122.4053,
    specialties: ['Level 1 Adult Trauma', 'Comprehensive Stroke Center', 'Burn Care', 'Pediatric Emergency'],
    emergencyWaitTime: '12 mins'
  },
  {
    name: 'UCSF Medical Center at Mission Bay',
    address: '1825 4th St, San Francisco, CA 94158',
    phone: '(415) 353-6000',
    latitude: 37.7680,
    longitude: -122.3915,
    specialties: ['Pediatric Emergency', 'Cardiac Emergency', 'Oncology', 'High-Risk OB'],
    emergencyWaitTime: '8 mins'
  },
  {
    name: 'UCSF Helen Diller Medical Center at Parnassus',
    address: '505 Parnassus Ave, San Francisco, CA 94143',
    phone: '(415) 476-1000',
    latitude: 37.7631,
    longitude: -122.4578,
    specialties: ['Comprehensive Stroke Center', 'Organ Transplant', 'Advanced Cardiology', 'Neurology'],
    emergencyWaitTime: '15 mins'
  },
  {
    name: 'CPMC Van Ness Campus - Sutter Health',
    address: '1101 Van Ness Ave, San Francisco, CA 94109',
    phone: '(415) 600-6000',
    latitude: 37.7858,
    longitude: -122.4219,
    specialties: ['Primary Stroke Center', 'Cardiac Catheterization', 'Orthopedic Trauma', 'Emergency Surgery'],
    emergencyWaitTime: '10 mins'
  },
  {
    name: 'Saint Francis Memorial Hospital',
    address: '900 Hyde St, San Francisco, CA 94109',
    phone: '(415) 353-6000',
    latitude: 37.7896,
    longitude: -122.4172,
    specialties: ['Bothin Burn Center', 'Emergency Psychiatry', 'Occupational Medicine', 'Wound Care'],
    emergencyWaitTime: '5 mins'
  },
  {
    name: 'Kaiser Permanente San Francisco Medical Center',
    address: '2425 Geary Blvd, San Francisco, CA 94115',
    phone: '(415) 833-2000',
    latitude: 37.7824,
    longitude: -122.4431,
    specialties: ['Adult Emergency', 'Telestroke', 'Cardiovascular Intensive Care', 'Urgent Care'],
    emergencyWaitTime: '18 mins'
  },
  {
    name: "St. Mary's Medical Center - Dignity Health",
    address: '450 Stanyan St, San Francisco, CA 94117',
    phone: '(415) 668-1000',
    latitude: 37.7725,
    longitude: -122.4542,
    specialties: ['Comprehensive Spine & Orthopedics', 'Emergency Care', 'Cardiovascular Care'],
    emergencyWaitTime: '14 mins'
  },
  {
    name: 'CPMC Mission Bernal Campus',
    address: '3555 Cesar Chavez St, San Francisco, CA 94110',
    phone: '(415) 641-6900',
    latitude: 37.7478,
    longitude: -122.4206,
    specialties: ['Emergency Medicine', 'Acute Care for the Elderly', 'Orthopedics'],
    emergencyWaitTime: '7 mins'
  }
];

export function calculateDistanceMiles(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Radius of Earth in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
