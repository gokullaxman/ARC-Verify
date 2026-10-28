import { DocumentRecord, LandRecord, CadastralParcel, AuditLog, User, AIFeedbackRecord, Role, SystemSettings, AppNotification, PermissionKey } from '@/types';

export const MASTER_STATES = [
  'Tamil Nadu',
  'Karnataka',
  'Maharashtra',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Rajasthan',
  'Gujarat'
];

export const ALL_PERMISSIONS: { key: PermissionKey; label: string; category: string }[] = [
  { key: 'DOCUMENT_VIEW', label: 'View Documents', category: 'Documents' },
  { key: 'DOCUMENT_UPLOAD', label: 'Upload Documents', category: 'Documents' },
  { key: 'DOCUMENT_PROCESS', label: 'Execute AI Pipeline', category: 'Documents' },
  { key: 'DOCUMENT_DOWNLOAD', label: 'Download Documents', category: 'Documents' },
  { key: 'DOCUMENT_DELETE', label: 'Delete Documents', category: 'Documents' },
  { key: 'RECORD_VIEW', label: 'View Land Records', category: 'Records' },
  { key: 'RECORD_CREATE', label: 'Create Records', category: 'Records' },
  { key: 'RECORD_EDIT', label: 'Edit Records', category: 'Records' },
  { key: 'RECORD_APPROVE', label: 'Approve Verified Records', category: 'Records' },
  { key: 'RECORD_REJECT', label: 'Reject Records', category: 'Records' },
  { key: 'RECORD_DELETE', label: 'Delete Records', category: 'Records' },
  { key: 'VERIFICATION_VIEW', label: 'View Verification Queue', category: 'Verification' },
  { key: 'VERIFICATION_EDIT', label: 'Edit Extracted Fields', category: 'Verification' },
  { key: 'VERIFICATION_APPROVE', label: 'Approve Verification Tasks', category: 'Verification' },
  { key: 'VERIFICATION_REJECT', label: 'Reject Verification Tasks', category: 'Verification' },
  { key: 'GIS_VIEW', label: 'View Cadastral Map', category: 'GIS' },
  { key: 'GIS_EDIT', label: 'Edit Parcels & Boundaries', category: 'GIS' },
  { key: 'USER_VIEW', label: 'View User Directory', category: 'Users' },
  { key: 'USER_CREATE', label: 'Create New Users', category: 'Users' },
  { key: 'USER_EDIT', label: 'Edit User Details', category: 'Users' },
  { key: 'USER_DISABLE', label: 'Disable/Enable Users', category: 'Users' },
  { key: 'ROLE_VIEW', label: 'View Roles & Permissions', category: 'Roles' },
  { key: 'ROLE_CREATE', label: 'Create Custom Roles', category: 'Roles' },
  { key: 'ROLE_EDIT', label: 'Edit Role Permissions', category: 'Roles' },
  { key: 'ROLE_DELETE', label: 'Delete Custom Roles', category: 'Roles' },
  { key: 'AUDIT_VIEW', label: 'View System Audit Ledger', category: 'Audit' },
  { key: 'ANALYTICS_VIEW', label: 'View Analytics & Reports', category: 'Analytics' },
  { key: 'VALIDATION_RUN', label: 'Execute Validation Engine', category: 'Validation' },
  { key: 'VALIDATION_CONFIGURE', label: 'Configure Validation Rules', category: 'Validation' },
  { key: 'AI_PROCESS', label: 'Trigger Indic AI Recognition', category: 'AI Pipeline' },
  { key: 'SYSTEM_SETTINGS', label: 'Manage System Settings & Thresholds', category: 'Settings' },
];

export const INITIAL_ROLES: Role[] = [
  {
    id: 'role-super-admin',
    name: 'Super Admin',
    code: 'SUPER_ADMIN',
    description: 'Unrestricted administrative access to all state jurisdictions, security controls, user management, and system configurations.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: ALL_PERMISSIONS.map(p => p.key)
  },
  {
    id: 'role-admin',
    name: 'Admin',
    code: 'ADMIN',
    description: 'Operational management of users, roles, district progress, documents, land records, GIS, and audit trails.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_PROCESS', 'DOCUMENT_DOWNLOAD',
      'RECORD_VIEW', 'RECORD_CREATE', 'RECORD_EDIT', 'RECORD_APPROVE',
      'VERIFICATION_VIEW', 'VERIFICATION_EDIT', 'VERIFICATION_APPROVE',
      'GIS_VIEW', 'GIS_EDIT',
      'USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DISABLE',
      'ROLE_VIEW', 'ROLE_CREATE', 'ROLE_EDIT',
      'AUDIT_VIEW', 'ANALYTICS_VIEW', 'VALIDATION_RUN', 'VALIDATION_CONFIGURE', 'AI_PROCESS'
    ]
  },
  {
    id: 'role-revenue-officer',
    name: 'Revenue Officer',
    code: 'REVENUE_OFFICER',
    description: 'Tahsildar / RDO responsible for document ingestion, AI execution, rule validation, and land record verification within assigned taluks.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_PROCESS', 'DOCUMENT_DOWNLOAD',
      'RECORD_VIEW', 'RECORD_CREATE', 'RECORD_EDIT', 'RECORD_APPROVE', 'RECORD_REJECT',
      'VERIFICATION_VIEW', 'VERIFICATION_EDIT', 'VERIFICATION_APPROVE', 'VERIFICATION_REJECT',
      'GIS_VIEW', 'VALIDATION_RUN', 'AI_PROCESS', 'ANALYTICS_VIEW'
    ]
  },
  {
    id: 'role-verification-officer',
    name: 'Verification Officer',
    code: 'VERIFICATION_OFFICER',
    description: 'Dedicated officer reviewing low-confidence extractions, resolving cadastral discrepancies, and signing off records.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'DOCUMENT_VIEW', 'DOCUMENT_DOWNLOAD',
      'RECORD_VIEW', 'RECORD_EDIT',
      'VERIFICATION_VIEW', 'VERIFICATION_EDIT', 'VERIFICATION_APPROVE', 'VERIFICATION_REJECT',
      'GIS_VIEW', 'VALIDATION_RUN'
    ]
  },
  {
    id: 'role-data-entry-operator',
    name: 'Data Entry Operator',
    code: 'DATA_ENTRY_OPERATOR',
    description: 'Uploads legacy revenue registers, triggers OCR preprocessing, and corrects field labels. Cannot approve final land records.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'DOCUMENT_VIEW', 'DOCUMENT_UPLOAD', 'DOCUMENT_PROCESS',
      'RECORD_VIEW', 'RECORD_EDIT', 'AI_PROCESS'
    ]
  },
  {
    id: 'role-gis-officer',
    name: 'GIS Officer',
    code: 'GIS_OFFICER',
    description: 'Manages survey parcel polygons, PostGIS spatial geometries, and resolves area tolerance deviations.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'GIS_VIEW', 'GIS_EDIT', 'RECORD_VIEW', 'DOCUMENT_VIEW', 'VALIDATION_RUN'
    ]
  },
  {
    id: 'role-auditor',
    name: 'Auditor',
    code: 'AUDITOR',
    description: 'Read-only administrative oversight of immutable audit ledgers, validation histories, and system changes.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'AUDIT_VIEW', 'RECORD_VIEW', 'DOCUMENT_VIEW', 'ANALYTICS_VIEW'
    ]
  },
  {
    id: 'role-viewer',
    name: 'Viewer',
    code: 'VIEWER',
    description: 'Citizen service liaison and public inquiry officer with read-only access to approved RoRs and cadastral boundaries.',
    userCount: 1,
    createdAt: '2026-01-01T00:00:00Z',
    isSystem: true,
    permissions: [
      'RECORD_VIEW', 'GIS_VIEW'
    ]
  }
];

export const DEMO_USERS: User[] = [
  {
    id: 'usr-superadmin',
    name: 'Dr. Ramesh Sundaram, IAS',
    email: 'superadmin@example.com',
    role: 'SUPER_ADMIN',
    designation: 'Director General of Land Records',
    department: 'Ministry of Rural Development — DoLR',
    state: 'Tamil Nadu',
    district: 'All Districts',
    taluk: 'All Taluks',
    village: 'All Villages',
    employeeId: 'IAS-1998-TN-042',
    phone: '+91 98401 23456',
    status: 'ACTIVE',
    passwordHash: 'scrypt$4697bd36163d281e19aad8b0c1f470db$82ab2b241c141230b2d5773592ad5b9a5fc51fc3257921a4df02ba260b38c4310ffe3f578c60f4f38013035114aa7556aee95c612cc9cc05bb07f26e02215e89',
    permissions: ALL_PERMISSIONS.map(p => p.key),
    lastLogin: '2026-09-07T09:00:00Z'
  },
  {
    id: 'usr-admin',
    name: 'P. Arumugam',
    email: 'admin@example.com',
    role: 'ADMIN',
    designation: 'Joint Director (Modernization)',
    department: 'Department of Land Resources',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'All Taluks',
    employeeId: 'ADM-TN-2004-18',
    phone: '+91 98402 34567',
    status: 'ACTIVE',
    passwordHash: 'scrypt$58fc8c05a06bbe4c272807ccf6733a75$8683fcae612f93e3419702ed06f1dba8600f3cce66e09f4024b6f81f1410c05175a7a788aeb542fa173897e2179841f2b51dba9b8048abb5e63d5297bed26691',
    permissions: INITIAL_ROLES.find(r => r.code === 'ADMIN')?.permissions || [],
    lastLogin: '2026-09-07T08:30:00Z'
  },
  {
    id: 'usr-officer',
    name: 'K. Meenakshi Ammal',
    email: 'officer@example.com',
    role: 'REVENUE_OFFICER',
    designation: 'Tahsildar / Revenue Divisional Officer',
    department: 'Revenue & Disaster Management Dept',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'Madurai North',
    village: 'Kovilur',
    employeeId: 'REV-MDU-1042',
    phone: '+91 98403 45678',
    status: 'ACTIVE',
    passwordHash: 'scrypt$9b38b18e4ffae8c96068b51c79fe9e67$ae0a75d30c181c812ed1054c915a2c7cad2a7dd3a3ceb0f877023a6c4aa98b3cc30a8d622e8c7173fc6565ddd40f50cf32e37adf1cb8e641914d67c5e5f8ee83',
    permissions: INITIAL_ROLES.find(r => r.code === 'REVENUE_OFFICER')?.permissions || [],
    lastLogin: '2026-09-07T09:30:00Z'
  },
  {
    id: 'usr-verifier',
    name: 'Suresh Kumar Verma',
    email: 'verifier@example.com',
    role: 'VERIFICATION_OFFICER',
    designation: 'Special Land Verification Inspector',
    department: 'Board of Revenue',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    taluk: 'Sadar',
    village: 'Shivpur',
    employeeId: 'VER-UP-2015-88',
    phone: '+91 98404 56789',
    status: 'ACTIVE',
    passwordHash: 'scrypt$ac624f96c384a992aa28650d4fc49561$f305990348ebb0c20114716f9ef244c61d26df5b19f8524179ee8a5c7f68a8168f04793a484cafb00e76c7c7cfbc745f359509ebd273e326b8c9c7cc7f94cafa',
    permissions: INITIAL_ROLES.find(r => r.code === 'VERIFICATION_OFFICER')?.permissions || [],
    lastLogin: '2026-09-07T07:45:00Z'
  },
  {
    id: 'usr-operator',
    name: 'Rajesh G. Kulkarni',
    email: 'operator@example.com',
    role: 'DATA_ENTRY_OPERATOR',
    designation: 'Senior Land Records Operator',
    department: 'District Collectorate Digital Cell',
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Haveli',
    village: 'Wagholi',
    employeeId: 'DEO-MH-2020-09',
    phone: '+91 98405 67890',
    status: 'ACTIVE',
    passwordHash: 'scrypt$052fbaaf756e65ea7bd042441b8b2aa7$55edefd9ec7c54ee8484f8b95ad329678c97d31e75a857bbb9a645cd3218ec503f1336f3be2368a87f0b908af52065241490ad435d756cb8089939b1f490b11a',
    permissions: INITIAL_ROLES.find(r => r.code === 'DATA_ENTRY_OPERATOR')?.permissions || [],
    lastLogin: '2026-09-07T09:15:00Z'
  },
  {
    id: 'usr-gis',
    name: 'Dr. Priya V. Nambiar',
    email: 'gis@example.com',
    role: 'GIS_OFFICER',
    designation: 'Cadastral GIS Specialist',
    department: 'Survey and Land Records Dept',
    state: 'Karnataka',
    district: 'Mysuru',
    taluk: 'Nanjangud',
    village: 'Hullahalli',
    employeeId: 'GIS-KA-2018-44',
    phone: '+91 98406 78901',
    status: 'ACTIVE',
    passwordHash: 'scrypt$4e58bddb201b2c1be1323f7b91dfd0ed$5ee87f550a3f5a558aa7fbe0185e6bbb94eb6fa5574275470ceea020651f1b0240d3c70ea98a6e73567a2d22f890bfc49117dc66d27801ee7fb0c7143508a12e',
    permissions: INITIAL_ROLES.find(r => r.code === 'GIS_OFFICER')?.permissions || [],
    lastLogin: '2026-09-07T08:10:00Z'
  },
  {
    id: 'usr-auditor',
    name: 'G. Vijayaraghavan',
    email: 'auditor@example.com',
    role: 'AUDITOR',
    designation: 'Principal Land Auditor',
    department: 'Comptroller & Auditor General Liaison Cell',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'All Taluks',
    employeeId: 'AUD-CAG-2012-07',
    phone: '+91 98407 89012',
    status: 'ACTIVE',
    passwordHash: 'scrypt$6f8406f0a27ac2dbd950c64fc04a1ade$aa9154eb8afe1f1cdf92b1dc609069795a1446bf1af183c2f280be5655af984622a73e29cf18bf8c155d6648f69b752a408d2274e4cca78bfcedd929cd73b73c',
    permissions: INITIAL_ROLES.find(r => r.code === 'AUDITOR')?.permissions || [],
    lastLogin: '2026-09-06T17:20:00Z'
  },
  {
    id: 'usr-viewer',
    name: 'Anjali Deshmukh',
    email: 'viewer@example.com',
    role: 'VIEWER',
    designation: 'Citizen Public Services Liaison',
    department: 'National Informatics Centre (NIC)',
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Haveli',
    village: 'Wagholi',
    employeeId: 'NIC-MH-2022-55',
    phone: '+91 98408 90123',
    status: 'ACTIVE',
    passwordHash: 'scrypt$804b327b4c2cbc0e4e185a886021f10d$69b970b8c40f826378086cf13d52e654a6e1ac7f9c46fd461312bc6417a70afd6826edbc7c6eaf3983a5d6b89764a97d23ebede59dd8ce2fedc306b8e01908ec',
    permissions: INITIAL_ROLES.find(r => r.code === 'VIEWER')?.permissions || [],
    lastLogin: '2026-09-07T09:00:00Z'
  }
];

export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  confidenceThreshold: 90, // Human-in-the-Loop trigger percentage
  areaTolerancePercent: 15, // GIS area deviation threshold
  duplicateMatchThreshold: 85,
  supportedLanguages: [
    'Tamil', 'Hindi', 'Marathi', 'Bengali', 'Gujarati', 'Kannada', 'Telugu', 'English'
  ],
  documentTypes: [
    'Patta', 'Chitta', 'Adangal', 'Sale deed', 'Mutation record', 'Survey record', 'Historical register', 'Land ownership register'
  ],
  validationRulesEnabled: {
    RULE_SURVEY_FORMAT: true,
    RULE_VILLAGE_EXISTS: true,
    RULE_TALUK_EXISTS: true,
    RULE_DISTRICT_EXISTS: true,
    RULE_STATE_CONSISTENCY: true,
    RULE_AREA_POSITIVE: true,
    RULE_AREA_UNIT_VALID: true,
    RULE_DUPLICATE_CHECK: true,
    RULE_OWNER_CONFLICT: true,
    RULE_GIS_AREA_TOLERANCE: true
  },
  notificationsEnabled: true,
  emailAlertsEnabled: false,
  autoExtractLayoutLM: true,
  dilrmpApiSync: true,
  updatedAt: '2026-09-07T09:00:00Z',
  updatedBy: 'Dr. Ramesh Sundaram, IAS'
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-1',
    title: 'Document Processing Completed',
    message: 'Kovilur_Survey145_PattaExtract_1988.jpg processed through OpenCV & Indic-HTR.',
    type: 'INFO',
    read: false,
    createdAt: '2026-09-07T09:30:15Z',
    link: '/records/rec-001'
  },
  {
    id: 'notif-2',
    title: 'Human-in-the-Loop Verification Required',
    message: 'Record #rec-001 flagged: Overall confidence (76%) below configured threshold (90%).',
    type: 'WARNING',
    read: false,
    createdAt: '2026-09-07T09:30:18Z',
    link: '/verification'
  },
  {
    id: 'notif-3',
    title: 'Spatial Cadastral Area Discrepancy',
    message: 'Parcel Survey #145/2A: Document stated area (2.45 ac) deviates 16.6% from GIS polygon (2.10 ac).',
    type: 'WARNING',
    read: false,
    createdAt: '2026-09-07T09:30:20Z',
    link: '/records/rec-001'
  },
  {
    id: 'notif-4',
    title: 'Land Record Verified & Digitized',
    message: 'Record #rec-002 (Varanasi Khasra #248/1-B) approved and assigned Bhu-Aadhaar UP-VNS-02481B-8831.',
    type: 'SUCCESS',
    read: true,
    createdAt: '2026-09-07T08:20:00Z',
    link: '/records/rec-002'
  }
];

export const MASTER_LOCATIONS: Record<string, { districts: Record<string, { taluks: Record<string, string[]> }> }> = {
  'Tamil Nadu': {
    districts: {
      'Madurai': {
        taluks: {
          'Madurai North': ['Kovilur', 'Melur North', 'Samayanallur', 'Alagar Kovil'],
          'Madurai South': ['Tiruparankundram', 'Avaniyapuram', 'Thirunagar']
        }
      },
      'Chennai': {
        taluks: {
          'Egmore': ['Triplicane', 'Nungambakkam', 'Royapettah', 'Egmore North'],
          'Mylapore': ['Mylapore Rural', 'Mandaveli', 'Alwarpet']
        }
      },
      'Thanjavur': {
        taluks: {
          'Kumbakonam': ['Dharasuram', 'Papanasam', 'Swamimalai', 'Thirunageswaram'],
          'Thanjavur': ['Vallam', 'Budalur', 'Alakkudi']
        }
      }
    }
  },
  'Karnataka': {
    districts: {
      'Mysuru': {
        taluks: {
          'Mysuru': ['Chamundi Hills', 'Hootagalli', 'Kadakola', 'Varuna'],
          'Nanjangud': ['Hullahalli', 'Kavalande', 'Tagadur']
        }
      },
      'Belagavi': {
        taluks: {
          'Belagavi': ['Peeranwadi', 'Kakati', 'Desur', 'Sambre'],
          'Chikkodi': ['Ankali', 'Nipani', 'Sadalga']
        }
      }
    }
  },
  'Maharashtra': {
    districts: {
      'Pune': {
        taluks: {
          'Haveli': ['Wagholi', 'Uruli Kanchan', 'Hadapsar Rural', 'Loni Kalbhor'],
          'Mulshi': ['Pirangut', 'Paud', 'Lavale', 'Hinjavadi Rural']
        }
      },
      'Nashik': {
        taluks: {
          'Nashik': ['Deolali', 'Makhmalabad', 'Pathardi', 'Panchavati Rural'],
          'Sinnar': ['Musalgaon', 'Wavi', 'Pangri']
        }
      }
    }
  },
  'Uttar Pradesh': {
    districts: {
      'Varanasi': {
        taluks: {
          'Sadar': ['Shivpur', 'Rohania', 'Kashi Vidyapeeth Rural', 'Chitaipur'],
          'Pindra': ['Sindhora', 'Phulpur', 'Babatpur']
        }
      },
      'Ayodhya': {
        taluks: {
          'Sadar': ['Darshannagar', 'Bhadarsa', 'Masodha', 'Bikapur'],
          'Rudauli': ['Roshanganj', 'Mawai', 'Bhelsar']
        }
      }
    }
  },
  'Uttarakhand': {
    districts: {
      'Haridwar': {
        taluks: {
          'Roorkee': ['Aurangabad', 'Shivdaspur', 'Teeliwala', 'Civil Lines', 'Sadar'],
          'Haridwar': ['Kankhal', 'Jwalapur', 'Bahadrabad', 'Mayapur']
        }
      },
      'Dehradun': {
        taluks: {
          'Rishikesh': ['Doiwala', 'Rishikesh Rural'],
          'Dehradun': ['Vasant Vihar', 'Rajpur']
        }
      }
    }
  },
  'West Bengal': {
    districts: {
      'Burdwan': {
        taluks: {
          'Asansol': ['Jamuria', 'Raniganj', 'Barabani', 'Kalyanpur'],
          'Burdwan Sadar': ['Galsi', 'Bhatar', 'Memari']
        }
      }
    }
  },
  'Rajasthan': {
    districts: {
      'Jaipur': {
        taluks: {
          'Sadar': ['Mohalla Biraman', 'Amer', 'Sanganer'],
          'Chaksu': ['Kotkhawda', 'Shivdaspura']
        }
      }
    }
  }
};


export const INITIAL_PARCELS: CadastralParcel[] = [
  {
    id: 'pcl-101',
    ulpin: 'TN-MDU-01452A-0942',
    surveyNumber: '145',
    subdivision: '2A',
    village: 'Kovilur',
    taluk: 'Madurai North',
    district: 'Madurai',
    state: 'Tamil Nadu',
    gisArea: 2.10, // GIS computed 2.10 acres vs Doc 2.45 acres (16.6% deviation triggers warning)
    gisUnit: 'acre',
    ownerName: 'Ramesh Kumar S/o Sundaramoorthy',
    classification: 'Agricultural (Irrigated)',
    status: 'PENDING',
    coordinates: [
      [9.9620, 78.1250],
      [9.9645, 78.1280],
      [9.9630, 78.1310],
      [9.9605, 78.1275]
    ],
    center: [9.9625, 78.1278]
  },
  {
    id: 'pcl-102',
    ulpin: 'UP-VNS-02481B-8831',
    surveyNumber: '248',
    subdivision: '1-B',
    village: 'Shivpur',
    taluk: 'Sadar',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    gisArea: 1.42,
    gisUnit: 'hectare',
    ownerName: 'रामेश्वर प्रसाद शर्मा (Rameshwar Prasad Sharma)',
    classification: 'Agricultural (Irrigated)',
    status: 'VERIFIED',
    coordinates: [
      [25.3520, 82.9640],
      [25.3540, 82.9675],
      [25.3515, 82.9690],
      [25.3495, 82.9655]
    ],
    center: [25.3518, 82.9665]
  },
  {
    id: 'pcl-103',
    ulpin: 'MH-PUN-03124G-7712',
    surveyNumber: '312',
    subdivision: '4',
    village: 'Wagholi',
    taluk: 'Haveli',
    district: 'Pune',
    state: 'Maharashtra',
    gisArea: 2.11,
    gisUnit: 'hectare',
    ownerName: 'दत्तात्रय विठ्ठलराव पाटील (Dattatraya Patil)',
    classification: 'Agricultural (Dry/Rainfed)',
    status: 'VERIFIED',
    coordinates: [
      [18.5810, 73.9810],
      [18.5835, 73.9845],
      [18.5815, 73.9870],
      [18.5790, 73.9835]
    ],
    center: [18.5812, 73.9840]
  },
  {
    id: 'pcl-104',
    ulpin: 'TN-MDU-01452B-0943',
    surveyNumber: '145',
    subdivision: '2B',
    village: 'Kovilur',
    taluk: 'Madurai North',
    district: 'Madurai',
    state: 'Tamil Nadu',
    gisArea: 1.85,
    gisUnit: 'acre',
    ownerName: 'State Highways & Minor Irrigation (PWD)',
    classification: 'Government/Pormboke',
    status: 'VERIFIED',
    coordinates: [
      [9.9605, 78.1275],
      [9.9630, 78.1310],
      [9.9615, 78.1335],
      [9.9590, 78.1300]
    ],
    center: [9.9610, 78.1305]
  },
  {
    id: 'pcl-105',
    ulpin: 'KA-MYS-00891A-5521',
    surveyNumber: '89',
    subdivision: '1A',
    village: 'Hullahalli',
    taluk: 'Nanjangud',
    district: 'Mysuru',
    state: 'Karnataka',
    gisArea: 3.40,
    gisUnit: 'acre',
    ownerName: 'Basavanna Gowda S/o Nanjappa',
    classification: 'Agricultural (Irrigated)',
    status: 'VERIFIED',
    coordinates: [
      [12.1140, 76.6810],
      [12.1165, 76.6840],
      [12.1145, 76.6875],
      [12.1120, 76.6845]
    ],
    center: [12.1142, 76.6842]
  }
];

export const INITIAL_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc-001',
    fileName: 'Kovilur_Survey145_PattaExtract_1988.jpg',
    fileSize: 1845200,
    mimeType: 'image/jpeg',
    filePath: '/documents/sample-patta-1.jpg',
    documentType: 'Patta',
    pages: 1,
    language: 'Tamil',
    state: 'Tamil Nadu',
    district: 'Madurai',
    taluk: 'Madurai North',
    village: 'Kovilur',
    uploadedAt: '2026-09-07T09:30:00Z',
    uploadedBy: 'K. Meenakshi Ammal (Tahsildar)',
    status: 'VERIFICATION_REQUIRED',
    ocrConfidence: 0.76,
    recordId: 'rec-001',
    processingSteps: [
      { step: 'Document Ingestion', status: 'COMPLETED', timestamp: '2026-09-07T09:30:02Z', details: 'DPI check: 300 DPI verified, 1.84 MB JPEG' },
      { step: 'Image Preprocessing (OpenCV)', status: 'COMPLETED', timestamp: '2026-09-07T09:30:04Z', details: 'Grayscale, Non-local Means Denoising, Deskew angle: -1.4 deg' },
      { step: 'Text Detection & Line Segmentation', status: 'COMPLETED', timestamp: '2026-09-07T09:30:06Z', details: '14 text lines isolated, bounding boxes mapped' },
      { step: 'Multilingual OCR (Indic-HTR / Tamil)', status: 'COMPLETED', timestamp: '2026-09-07T09:30:09Z', details: 'Character accuracy: 91.4%, Vintage handwritten revenue script' },
      { step: 'Structured Field Extraction (LayoutLMv3)', status: 'COMPLETED', timestamp: '2026-09-07T09:30:11Z', details: '18 fields structured into LandRecord schema' },
      { step: 'Business Rules & Spatial Validation', status: 'COMPLETED', timestamp: '2026-09-07T09:30:13Z', details: '3 Warnings flagged: Faded text area, GIS area deviation, Owner spelling' }
    ]
  },
  {
    id: 'doc-002',
    fileName: 'Varanasi_Khasra_248_1B_1994.jpg',
    fileSize: 2154300,
    mimeType: 'image/jpeg',
    filePath: '/documents/sample-khasra-1.jpg',
    documentType: 'Historical register',
    pages: 1,
    language: 'Hindi',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    taluk: 'Sadar',
    village: 'Shivpur',
    uploadedAt: '2026-09-07T08:15:00Z',
    uploadedBy: 'Suresh Kumar Verma',
    status: 'VERIFIED',
    ocrConfidence: 0.96,
    recordId: 'rec-002',
    processingSteps: [
      { step: 'Document Ingestion', status: 'COMPLETED', timestamp: '2026-09-07T08:15:02Z' },
      { step: 'Image Preprocessing (OpenCV)', status: 'COMPLETED', timestamp: '2026-09-07T08:15:04Z' },
      { step: 'Text Detection & Segmentation', status: 'COMPLETED', timestamp: '2026-09-07T08:15:05Z' },
      { step: 'Multilingual OCR (Hindi/Devanagari)', status: 'COMPLETED', timestamp: '2026-09-07T08:15:07Z' },
      { step: 'Structured Field Extraction', status: 'COMPLETED', timestamp: '2026-09-07T08:15:08Z' },
      { step: 'Business Rules & Spatial Validation', status: 'COMPLETED', timestamp: '2026-09-07T08:15:10Z' }
    ]
  },
  {
    id: 'doc-003',
    fileName: 'Pune_Haveli_Satbara_7_12_Extract.jpg',
    fileSize: 1980000,
    mimeType: 'image/jpeg',
    filePath: '/documents/sample-satbara-1.jpg',
    documentType: 'Land ownership register',
    pages: 1,
    language: 'Marathi',
    state: 'Maharashtra',
    district: 'Pune',
    taluk: 'Haveli',
    village: 'Wagholi',
    uploadedAt: '2026-09-07T07:45:00Z',
    uploadedBy: 'Anjali Deshmukh',
    status: 'VERIFIED',
    ocrConfidence: 0.94,
    recordId: 'rec-003',
    processingSteps: [
      { step: 'Document Ingestion', status: 'COMPLETED', timestamp: '2026-09-07T07:45:02Z' },
      { step: 'Image Preprocessing (OpenCV)', status: 'COMPLETED', timestamp: '2026-09-07T07:45:03Z' },
      { step: 'Multilingual OCR (Marathi)', status: 'COMPLETED', timestamp: '2026-09-07T07:45:06Z' },
      { step: 'Structured Field Extraction', status: 'COMPLETED', timestamp: '2026-09-07T07:45:07Z' },
      { step: 'Business Rules & Spatial Validation', status: 'COMPLETED', timestamp: '2026-09-07T07:45:09Z' }
    ]
  },
  {
    id: 'doc-004',
    fileName: 'Thanjavur_Kumbakonam_Adangal_DuplicateTest.jpg',
    fileSize: 1420000,
    mimeType: 'image/jpeg',
    filePath: '/documents/sample-patta-1.jpg',
    documentType: 'Adangal',
    pages: 1,
    language: 'Tamil',
    state: 'Tamil Nadu',
    district: 'Thanjavur',
    taluk: 'Kumbakonam',
    village: 'Dharasuram',
    uploadedAt: '2026-09-07T11:10:00Z',
    uploadedBy: 'K. Meenakshi Ammal',
    status: 'VERIFICATION_REQUIRED',
    ocrConfidence: 0.88,
    recordId: 'rec-004',
    processingSteps: [
      { step: 'Document Ingestion', status: 'COMPLETED', timestamp: '2026-09-07T11:10:02Z' },
      { step: 'Image Preprocessing (OpenCV)', status: 'COMPLETED', timestamp: '2026-09-07T11:10:04Z' },
      { step: 'Multilingual OCR (Tamil)', status: 'COMPLETED', timestamp: '2026-09-07T11:10:07Z' },
      { step: 'Structured Field Extraction', status: 'COMPLETED', timestamp: '2026-09-07T11:10:08Z' },
      { step: 'Business Rules & Spatial Validation', status: 'COMPLETED', timestamp: '2026-09-07T11:10:11Z', details: 'Duplicate Survey# flagged against master record TN-TNJ-0082-1981' }
    ]
  },
  {
    id: 'doc-005',
    fileName: 'Mysuru_Nanjangud_SaleDeed_Dispute.jpg',
    fileSize: 2450000,
    mimeType: 'image/jpeg',
    filePath: '/documents/sample-satbara-1.jpg',
    documentType: 'Sale deed',
    pages: 2,
    language: 'Kannada',
    state: 'Karnataka',
    district: 'Mysuru',
    taluk: 'Nanjangud',
    village: 'Hullahalli',
    uploadedAt: '2026-09-07T12:00:00Z',
    uploadedBy: 'Dr. Ramesh Sundaram, IAS',
    status: 'VERIFICATION_REQUIRED',
    ocrConfidence: 0.69,
    recordId: 'rec-005',
    processingSteps: [
      { step: 'Document Ingestion', status: 'COMPLETED', timestamp: '2026-09-07T12:00:02Z' },
      { step: 'Image Preprocessing (OpenCV)', status: 'COMPLETED', timestamp: '2026-09-07T12:00:04Z', details: 'Severe ink fade, morphological closing applied' },
      { step: 'Multilingual OCR (Kannada)', status: 'COMPLETED', timestamp: '2026-09-07T12:00:08Z', details: 'Low average confidence (0.69) due to historical stamp damage' },
      { step: 'Structured Field Extraction', status: 'COMPLETED', timestamp: '2026-09-07T12:00:10Z' },
      { step: 'Business Rules & Spatial Validation', status: 'COMPLETED', timestamp: '2026-09-07T12:00:12Z', details: 'Ownership conflict: Mutation pending court decree #OS-421/2021' }
    ]
  }
];

export const INITIAL_LAND_RECORDS: LandRecord[] = [
  {
    id: 'rec-001',
    documentId: 'doc-001',
    ownerName: {
      value: 'Ramesh Kumor', // OCR misread with 0.72 confidence
      confidence: 0.72,
      originalValue: 'Ramesh Kumor',
      isModified: false,
      explanation: 'Source text handwritten with faint trailing ink on last vowel.',
      boundingBox: [120, 240, 260, 48]
    },
    fatherOrHusbandName: {
      value: 'Sundaramoorthy',
      confidence: 0.89,
      originalValue: 'Sundaramoorthy',
      boundingBox: [120, 310, 240, 44]
    },
    surveyNumber: {
      value: '145',
      confidence: 0.95,
      boundingBox: [420, 150, 90, 40]
    },
    subdivisionNumber: {
      value: '2A',
      confidence: 0.92,
      boundingBox: [520, 150, 60, 40]
    },
    khasraNumber: {
      value: '145/2A',
      confidence: 0.94,
      boundingBox: [420, 150, 160, 40]
    },
    khataNumber: {
      value: '00842',
      confidence: 0.91,
      boundingBox: [120, 150, 110, 38]
    },
    pattaNumber: {
      value: '842',
      confidence: 0.93,
      boundingBox: [250, 150, 80, 38]
    },
    plotNumber: {
      value: 'Plot 4-East',
      confidence: 0.84,
      boundingBox: [420, 210, 120, 40]
    },
    village: {
      value: 'Kovilur',
      confidence: 0.96,
      boundingBox: [120, 90, 140, 38]
    },
    taluk: {
      value: 'Madurai North',
      confidence: 0.94,
      boundingBox: [280, 90, 160, 38]
    },
    district: {
      value: 'Madurai',
      confidence: 0.98,
      boundingBox: [460, 90, 130, 38]
    },
    state: {
      value: 'Tamil Nadu',
      confidence: 0.99,
      boundingBox: [610, 90, 140, 38]
    },
    landArea: {
      value: 2.45,
      confidence: 0.67, // low confidence due to torn fold on register page
      originalValue: 2.45,
      explanation: 'Numerical digit "4" intersected by historic paper crease.',
      boundingBox: [120, 410, 80, 44]
    },
    areaUnit: {
      value: 'acre',
      confidence: 0.95,
      boundingBox: [210, 410, 70, 44]
    },
    landClassification: {
      value: 'Agricultural (Irrigated)',
      confidence: 0.92,
      boundingBox: [350, 410, 220, 44]
    },
    ownershipType: {
      value: 'Individual',
      confidence: 0.94,
      boundingBox: [120, 480, 120, 40]
    },
    mutationNumber: {
      value: 'M-2024-103',
      confidence: 0.42, // Low confidence
      originalValue: 'M-2024-103',
      explanation: 'Smudged rubber stamp registration seal.',
      boundingBox: [120, 550, 160, 46]
    },
    registrationNumber: {
      value: 'REG-1988/4412',
      confidence: 0.88,
      boundingBox: [340, 550, 180, 46]
    },
    registrationDate: {
      value: '1988-06-14',
      confidence: 0.86,
      boundingBox: [540, 550, 130, 46]
    },
    previousOwner: {
      value: 'Subramanian Pillai',
      confidence: 0.79,
      boundingBox: [120, 620, 220, 44]
    },
    currentOwner: {
      value: 'Ramesh Kumor',
      confidence: 0.72,
      boundingBox: [360, 620, 200, 44]
    },
    overallConfidence: 0.76,
    status: 'REQUIRES_VERIFICATION',
    ulpin: 'TN-MDU-01452A-0942',
    gisParcelId: 'pcl-101',
    assignedOfficer: 'K. Meenakshi Ammal',
    lastModified: '2026-09-07T09:30:13Z',
    validationResult: {
      recordId: 'rec-001',
      overallStatus: 'WARNING',
      rulesPassed: 7,
      rulesTotal: 10,
      rules: [
        { ruleId: 'RULE-1', name: 'Survey Number Format', status: 'PASSED', message: 'Survey number 145/2A complies with Tamil Nadu Cadastral standard format.' },
        { ruleId: 'RULE-2', name: 'Village Master Database Check', status: 'PASSED', message: 'Village "Kovilur" confirmed in Madurai North Taluk registry.' },
        { ruleId: 'RULE-3', name: 'State/District Consistency', status: 'PASSED', message: 'District "Madurai" successfully mapped to State "Tamil Nadu".' },
        { ruleId: 'RULE-4', name: 'Positive Extent Area', status: 'PASSED', message: 'Area value 2.45 is positive and non-zero.' },
        { ruleId: 'RULE-5', name: 'Standard Area Unit', status: 'PASSED', message: 'Unit "acre" recognized by revenue master rules.' },
        { ruleId: 'RULE-6', name: 'Duplicate Record Check', status: 'PASSED', message: 'No duplicate survey parcel active under identical mutation sequence.' },
        { ruleId: 'RULE-7', name: 'Owner Name Master Comparison', status: 'WARNING', message: 'Extracted name "Ramesh Kumor" has 84% phonetic proximity to prior registered holder "Ramesh Kumar". Verification required.', fieldAffected: 'ownerName' },
        { ruleId: 'RULE-8', name: 'Mutation Sequence Validity', status: 'WARNING', message: 'Mutation entry "M-2024-103" stamp has low optical confidence (42%). Requires manual officer review.', fieldAffected: 'mutationNumber' },
        { ruleId: 'RULE-9', name: 'GIS Spatial Area Tolerance', status: 'WARNING', message: 'Document stated area (2.45 acres) deviates from GIS cadastral polygon (2.10 acres) by 16.6% (tolerance limit: 10%). Physical re-measurement recommended.', fieldAffected: 'landArea' },
        { ruleId: 'RULE-10', name: 'Ownership Encumbrance Check', status: 'PASSED', message: 'No active civil court stay or bank hypothecation lock on record.' }
      ],
      duplicateCheck: {
        isPotentialDuplicate: false,
        details: 'No overlapping ownership deeds filed for survey parcel 145/2A in last 12 months.'
      },
      gisAreaCheck: {
        status: 'WARNING',
        extractedArea: 2.45,
        gisArea: 2.10,
        unit: 'acre',
        deviationPercentage: 16.6
      }
    }
  },
  {
    id: 'rec-002',
    documentId: 'doc-002',
    ownerName: { value: 'रामेश्वर प्रसाद शर्मा (Rameshwar Prasad Sharma)', confidence: 0.98 },
    fatherOrHusbandName: { value: 'श्री अयोध्या नाथ शर्मा (Ayodhya Nath Sharma)', confidence: 0.96 },
    surveyNumber: { value: '248', confidence: 0.99 },
    subdivisionNumber: { value: '1-B', confidence: 0.97 },
    khasraNumber: { value: '248/1-B', confidence: 0.99 },
    khataNumber: { value: '00142', confidence: 0.98 },
    pattaNumber: { value: '142', confidence: 0.97 },
    plotNumber: { value: 'Khasra Plot 1', confidence: 0.95 },
    village: { value: 'Shivpur', confidence: 0.99 },
    taluk: { value: 'Sadar', confidence: 0.98 },
    district: { value: 'Varanasi', confidence: 0.99 },
    state: { value: 'Uttar Pradesh', confidence: 0.99 },
    landArea: { value: 1.42, confidence: 0.96 },
    areaUnit: { value: 'hectare', confidence: 0.98 },
    landClassification: { value: 'Agricultural (Irrigated)', confidence: 0.97 },
    ownershipType: { value: 'Individual', confidence: 0.98 },
    mutationNumber: { value: 'UP-VNS-MUT-2023-841', confidence: 0.94 },
    registrationNumber: { value: 'B-9912/1994', confidence: 0.95 },
    registrationDate: { value: '1994-11-22', confidence: 0.96 },
    previousOwner: { value: 'अयोध्या नाथ शर्मा (Ayodhya Nath Sharma)', confidence: 0.94 },
    currentOwner: { value: 'रामेश्वर प्रसाद शर्मा (Rameshwar Prasad Sharma)', confidence: 0.98 },
    overallConfidence: 0.96,
    status: 'VERIFIED',
    ulpin: 'UP-VNS-02481B-8831',
    gisParcelId: 'pcl-102',
    assignedOfficer: 'Suresh Kumar Verma',
    verifiedAt: '2026-09-07T08:30:00Z',
    verifiedBy: 'Suresh Kumar Verma',
    lastModified: '2026-09-07T08:30:00Z',
    validationResult: {
      recordId: 'rec-002',
      overallStatus: 'PASSED',
      rulesPassed: 10,
      rulesTotal: 10,
      rules: [
        { ruleId: 'RULE-1', name: 'Survey Number Format', status: 'PASSED', message: 'Khasra 248/1-B matches UP Revenue Code standards.' },
        { ruleId: 'RULE-2', name: 'Village Master Check', status: 'PASSED', message: 'Shivpur verified in Sadar tehsil.' },
        { ruleId: 'RULE-3', name: 'State/District Match', status: 'PASSED', message: 'Varanasi verified in Uttar Pradesh.' },
        { ruleId: 'RULE-4', name: 'Positive Area', status: 'PASSED', message: 'Area 1.42 Ha verified.' },
        { ruleId: 'RULE-5', name: 'Area Unit', status: 'PASSED', message: 'Hectare unit recognized.' },
        { ruleId: 'RULE-6', name: 'Duplicate Check', status: 'PASSED', message: 'Zero duplicate claims.' },
        { ruleId: 'RULE-7', name: 'Owner Verification', status: 'PASSED', message: 'Owner name cross-referenced with inheritance deed.' },
        { ruleId: 'RULE-8', name: 'Mutation Check', status: 'PASSED', message: 'Inheritance mutation verified.' },
        { ruleId: 'RULE-9', name: 'GIS Area Matching', status: 'PASSED', message: 'Doc area (1.42 Ha) matches GIS parcel (1.42 Ha) within 0.2% tolerance.' },
        { ruleId: 'RULE-10', name: 'Encumbrance Clear', status: 'PASSED', message: 'No dues or restrictions found.' }
      ],
      duplicateCheck: { isPotentialDuplicate: false },
      gisAreaCheck: { status: 'PASSED', extractedArea: 1.42, gisArea: 1.42, unit: 'hectare', deviationPercentage: 0.2 }
    }
  },
  {
    id: 'rec-003',
    documentId: 'doc-003',
    ownerName: { value: 'दत्तात्रय विठ्ठलराव पाटील (Dattatraya Patil)', confidence: 0.96 },
    fatherOrHusbandName: { value: 'विठ्ठलराव संभाजी पाटील (Vitthalrao Patil)', confidence: 0.94 },
    surveyNumber: { value: '312', confidence: 0.98 },
    subdivisionNumber: { value: '4', confidence: 0.95 },
    khasraNumber: { value: 'Gat No: 312/4', confidence: 0.97 },
    khataNumber: { value: '00405', confidence: 0.93 },
    pattaNumber: { value: '405', confidence: 0.93 },
    plotNumber: { value: 'Gat 312 P-4', confidence: 0.91 },
    village: { value: 'Wagholi', confidence: 0.98 },
    taluk: { value: 'Haveli', confidence: 0.97 },
    district: { value: 'Pune', confidence: 0.99 },
    state: { value: 'Maharashtra', confidence: 0.99 },
    landArea: { value: 2.11, confidence: 0.94 },
    areaUnit: { value: 'hectare', confidence: 0.97 },
    landClassification: { value: 'Agricultural (Dry/Rainfed)', confidence: 0.95 },
    ownershipType: { value: 'Individual', confidence: 0.96 },
    mutationNumber: { value: 'MH-FERFAR-782', confidence: 0.93 },
    registrationNumber: { value: 'HAV-8821/2004', confidence: 0.92 },
    registrationDate: { value: '2004-03-15', confidence: 0.91 },
    previousOwner: { value: 'विठ्ठलराव संभाजी पाटील', confidence: 0.93 },
    currentOwner: { value: 'दत्तात्रय विठ्ठलराव पाटील', confidence: 0.96 },
    overallConfidence: 0.94,
    status: 'VERIFIED',
    ulpin: 'MH-PUN-03124G-7712',
    gisParcelId: 'pcl-103',
    assignedOfficer: 'Anjali Deshmukh',
    verifiedAt: '2026-09-07T08:00:00Z',
    verifiedBy: 'Anjali Deshmukh',
    lastModified: '2026-09-07T08:00:00Z',
    validationResult: {
      recordId: 'rec-003',
      overallStatus: 'PASSED',
      rulesPassed: 10,
      rulesTotal: 10,
      rules: [
        { ruleId: 'RULE-1', name: 'Survey Number Format', status: 'PASSED', message: 'Gat 312/4 valid for Maharashtra LRMS.' },
        { ruleId: 'RULE-2', name: 'Village Master Check', status: 'PASSED', message: 'Wagholi, Haveli confirmed.' },
        { ruleId: 'RULE-3', name: 'State/District Check', status: 'PASSED', message: 'Pune, Maharashtra confirmed.' },
        { ruleId: 'RULE-4', name: 'Area Positive', status: 'PASSED', message: 'Area 2.11 Ha confirmed.' },
        { ruleId: 'RULE-5', name: 'Unit Check', status: 'PASSED', message: 'Hectare unit approved.' },
        { ruleId: 'RULE-6', name: 'Duplicate Check', status: 'PASSED', message: 'No duplicate entry detected.' },
        { ruleId: 'RULE-7', name: 'Owner Check', status: 'PASSED', message: 'Matched with Satbara 7/12 records.' },
        { ruleId: 'RULE-8', name: 'Mutation Check', status: 'PASSED', message: 'Ferfar 782 verified.' },
        { ruleId: 'RULE-9', name: 'GIS Area Matching', status: 'PASSED', message: 'Exact match with cadastral parcel geometry (2.11 Ha).' },
        { ruleId: 'RULE-10', name: 'Encumbrance Clear', status: 'PASSED', message: 'Clean title verified.' }
      ],
      duplicateCheck: { isPotentialDuplicate: false },
      gisAreaCheck: { status: 'PASSED', extractedArea: 2.11, gisArea: 2.11, unit: 'hectare', deviationPercentage: 0.0 }
    }
  },
  {
    id: 'rec-004',
    documentId: 'doc-004',
    ownerName: { value: 'Kalyanasundaram S', confidence: 0.88 },
    fatherOrHusbandName: { value: 'Saminatha Mudaliar', confidence: 0.86 },
    surveyNumber: { value: '82', confidence: 0.94 },
    subdivisionNumber: { value: '3', confidence: 0.92 },
    khasraNumber: { value: '82/3', confidence: 0.93 },
    khataNumber: { value: '00319', confidence: 0.89 },
    pattaNumber: { value: '319', confidence: 0.90 },
    plotNumber: { value: 'South Field', confidence: 0.85 },
    village: { value: 'Dharasuram', confidence: 0.95 },
    taluk: { value: 'Kumbakonam', confidence: 0.93 },
    district: { value: 'Thanjavur', confidence: 0.96 },
    state: { value: 'Tamil Nadu', confidence: 0.98 },
    landArea: { value: 1.75, confidence: 0.87 },
    areaUnit: { value: 'acre', confidence: 0.96 },
    landClassification: { value: 'Agricultural (Irrigated)', confidence: 0.91 },
    ownershipType: { value: 'Individual', confidence: 0.92 },
    mutationNumber: { value: 'TN-MUT-2018-994', confidence: 0.84 },
    registrationNumber: { value: 'KUM-1102/2018', confidence: 0.88 },
    registrationDate: { value: '2018-05-10', confidence: 0.85 },
    previousOwner: { value: 'Murugesan Pillai', confidence: 0.82 },
    currentOwner: { value: 'Kalyanasundaram S', confidence: 0.88 },
    overallConfidence: 0.88,
    status: 'REQUIRES_VERIFICATION',
    ulpin: 'TN-TNJ-00823A-1104',
    assignedOfficer: 'K. Meenakshi Ammal',
    lastModified: '2026-09-07T11:10:11Z',
    validationResult: {
      recordId: 'rec-004',
      overallStatus: 'FAILED',
      rulesPassed: 8,
      rulesTotal: 10,
      rules: [
        { ruleId: 'RULE-1', name: 'Survey Number Format', status: 'PASSED', message: 'Format 82/3 is valid.' },
        { ruleId: 'RULE-2', name: 'Village Master Check', status: 'PASSED', message: 'Dharasuram confirmed in Kumbakonam.' },
        { ruleId: 'RULE-3', name: 'State/District Check', status: 'PASSED', message: 'Thanjavur, Tamil Nadu valid.' },
        { ruleId: 'RULE-4', name: 'Area Positive', status: 'PASSED', message: 'Area 1.75 acres valid.' },
        { ruleId: 'RULE-5', name: 'Area Unit', status: 'PASSED', message: 'Acre recognized.' },
        { ruleId: 'RULE-6', name: 'Duplicate Record Check', status: 'FAILED', message: 'Critical duplicate conflict: Survey 82/3 already assigned to Patta #112 (Owner: A. Swaminathan) registered on 2012-08-14.' },
        { ruleId: 'RULE-7', name: 'Owner Verification', status: 'WARNING', message: 'Owner does not match existing Patta #112 record on file.' },
        { ruleId: 'RULE-8', name: 'Mutation Check', status: 'PASSED', message: 'Mutation registered.' },
        { ruleId: 'RULE-9', name: 'GIS Area Matching', status: 'PASSED', message: 'Matches parcel.' },
        { ruleId: 'RULE-10', name: 'Encumbrance Clear', status: 'WARNING', message: 'Conflicting registry claim exists.' }
      ],
      duplicateCheck: {
        isPotentialDuplicate: true,
        confidence: 0.94,
        matchingRecordId: 'TN-TNJ-0082-1981',
        details: 'Survey 82/3 in Dharasuram village currently registered to A. Swaminathan under Patta 112.'
      },
      gisAreaCheck: { status: 'PASSED', extractedArea: 1.75, gisArea: 1.74, unit: 'acre', deviationPercentage: 0.6 }
    }
  },
  {
    id: 'rec-005',
    documentId: 'doc-005',
    ownerName: { value: 'Basavanna Gowda', confidence: 0.68 },
    fatherOrHusbandName: { value: 'Nanjappa', confidence: 0.66 },
    surveyNumber: { value: '89', confidence: 0.74 },
    subdivisionNumber: { value: '1A', confidence: 0.71 },
    khasraNumber: { value: '89/1A', confidence: 0.72 },
    khataNumber: { value: '00054', confidence: 0.69 },
    pattaNumber: { value: '54', confidence: 0.70 },
    plotNumber: { value: 'Plot North-B', confidence: 0.64 },
    village: { value: 'Hullahalli', confidence: 0.78 },
    taluk: { value: 'Nanjangud', confidence: 0.75 },
    district: { value: 'Mysuru', confidence: 0.82 },
    state: { value: 'Karnataka', confidence: 0.92 },
    landArea: { value: 3.40, confidence: 0.64 },
    areaUnit: { value: 'acre', confidence: 0.79 },
    landClassification: { value: 'Agricultural (Irrigated)', confidence: 0.72 },
    ownershipType: { value: 'Individual', confidence: 0.73 },
    mutationNumber: { value: 'KA-NAN-2020-0081', confidence: 0.61 },
    registrationNumber: { value: 'NAN-441/2020', confidence: 0.65 },
    registrationDate: { value: '2020-02-18', confidence: 0.67 },
    previousOwner: { value: 'Shivanna', confidence: 0.62 },
    currentOwner: { value: 'Basavanna Gowda', confidence: 0.68 },
    overallConfidence: 0.69,
    status: 'REQUIRES_VERIFICATION',
    ulpin: 'KA-MYS-00891A-5521',
    gisParcelId: 'pcl-105',
    assignedOfficer: 'Dr. Ramesh Sundaram, IAS',
    lastModified: '2026-09-07T12:00:12Z',
    validationResult: {
      recordId: 'rec-005',
      overallStatus: 'WARNING',
      rulesPassed: 7,
      rulesTotal: 10,
      rules: [
        { ruleId: 'RULE-1', name: 'Survey Number Format', status: 'PASSED', message: 'Survey 89/1A valid.' },
        { ruleId: 'RULE-2', name: 'Village Master Check', status: 'PASSED', message: 'Hullahalli confirmed in Nanjangud.' },
        { ruleId: 'RULE-3', name: 'State/District Check', status: 'PASSED', message: 'Mysuru, Karnataka confirmed.' },
        { ruleId: 'RULE-4', name: 'Area Positive', status: 'PASSED', message: 'Area 3.40 acres valid.' },
        { ruleId: 'RULE-5', name: 'Area Unit', status: 'PASSED', message: 'Acre recognized.' },
        { ruleId: 'RULE-6', name: 'Duplicate Check', status: 'PASSED', message: 'No direct duplicate deed.' },
        { ruleId: 'RULE-7', name: 'Owner Verification', status: 'WARNING', message: 'Dispute alert: Co-heir caveat filed on survey parcel.' },
        { ruleId: 'RULE-8', name: 'Mutation Check', status: 'WARNING', message: 'Mutation pending sub-court partition suit decree #OS-421/2021.' },
        { ruleId: 'RULE-9', name: 'GIS Area Matching', status: 'PASSED', message: 'Cadastral boundary area matches within 1%.' },
        { ruleId: 'RULE-10', name: 'Encumbrance Clear', status: 'WARNING', message: 'Judicial caveat flag active.' }
      ],
      duplicateCheck: { isPotentialDuplicate: false },
      gisAreaCheck: { status: 'PASSED', extractedArea: 3.40, gisArea: 3.40, unit: 'acre', deviationPercentage: 0.0 }
    }
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'aud-001',
    timestamp: '2026-09-07T08:15:02Z',
    userId: 'usr-3',
    userName: 'Suresh Kumar Verma',
    userRole: 'VERIFICATION_OFFICER',
    action: 'DOCUMENT_UPLOADED',
    documentId: 'doc-002',
    details: 'Uploaded 1-page scanned Khasra register for Shivpur village, Varanasi.'
  },
  {
    id: 'aud-002',
    timestamp: '2026-09-07T08:15:08Z',
    userId: 'usr-3',
    userName: 'AI Pipeline (TrOCR + LayoutLMv3)',
    userRole: 'ADMIN',
    action: 'FIELDS_EXTRACTED',
    recordId: 'rec-002',
    documentId: 'doc-002',
    details: 'Extracted 18 structured land attributes with 96% aggregate confidence.'
  },
  {
    id: 'aud-003',
    timestamp: '2026-09-07T08:30:00Z',
    userId: 'usr-3',
    userName: 'Suresh Kumar Verma',
    userRole: 'VERIFICATION_OFFICER',
    action: 'RECORD_APPROVED',
    recordId: 'rec-002',
    documentId: 'doc-002',
    details: 'Verified and signed off on Khasra 248/1-B (Owner: Rameshwar Prasad Sharma). Generated ULPIN UP-VNS-02481B-8831.'
  },
  {
    id: 'aud-004',
    timestamp: '2026-09-07T09:30:00Z',
    userId: 'usr-2',
    userName: 'K. Meenakshi Ammal',
    userRole: 'REVENUE_OFFICER',
    action: 'DOCUMENT_UPLOADED',
    documentId: 'doc-001',
    details: 'Uploaded Kovilur Survey 145 Patta historical record (JPEG, 300 DPI).'
  },
  {
    id: 'aud-005',
    timestamp: '2026-09-07T09:30:13Z',
    userId: 'usr-2',
    userName: 'Validation Engine (Automated Rules)',
    userRole: 'ADMIN',
    action: 'VALIDATION_EXECUTED',
    recordId: 'rec-001',
    documentId: 'doc-001',
    details: 'Executed 10 business rules: 7 passed, 3 warnings flagged (Owner phonetic match, Mutation seal confidence, GIS area deviation).'
  }
];

export const INITIAL_AI_FEEDBACK: AIFeedbackRecord[] = [
  {
    id: 'fb-001',
    recordId: 'rec-002',
    documentId: 'doc-002',
    fieldName: 'ownerName',
    originalValue: 'रामेश्वर प्रसाद शमा',
    correctedValue: 'रामेश्वर प्रसाद शर्मा',
    confidence: 0.88,
    documentType: 'Historical register',
    language: 'Hindi',
    officerId: 'usr-3',
    timestamp: '2026-09-07T08:28:40Z'
  }
];
