export const en = {
  appName: 'The Voices',
  tagline: 'Places and patterns',
  intro: {
    eyebrow: 'South Africa',
    line: 'Silence protects the wrong people. Your place on the map can protect someone still breathing.',
    saySomething: 'Say something',
    sub: 'Anonymous. No names. Just what happened, and where.',
  },
  nav: {
    map: 'Map',
    report: 'Report',
    notebook: 'Notebook',
    about: 'About',
  },
  emergency: {
    title: 'In danger now?',
    lead: 'Call first. This map is not emergency help.',
    showMore: 'More lines',
    showLess: 'Show less',
    police: 'Police',
    mobileEmergency: 'Emergency (any phone)',
    gbv: 'GBV Command Centre',
    childline: 'Childline',
    ambulance: 'Ambulance / Fire',
    lifeline: 'Lifeline',
    stopGbv: 'Stop Gender Violence',
    suicide: 'SADAG / mental health',
  },
  map: {
    kicker: 'How this works',
    howTitle: 'See places. Add your voice.',
    howBody:
      'Coloured spots appear when someone reports what happened in an area — no names. Tap a spot for details. To add something, go to Report.',
    goReport: 'Make a report',
    onThisMap: 'On this map right now',
    emptyMap: 'Nothing here yet. Be the first to mark a place.',
    clearFilter: 'Show everything',
    filters: 'Filters',
    timeRange: 'When',
    days7: '7 days',
    days30: '30 days',
    days90: '90 days',
    allTime: 'All time',
    tapHint: 'Tap a coloured spot for details',
    petition: 'Ask for patrols / lights here',
    petitioned: 'People asking for help here',
    petitionThanks: 'Your ask was added for this area.',
    noText: 'Count only — story stays private',
    reports: 'reports',
    heatNote: 'Spots grow stronger when the person it happened to reports.',
    loading: 'Loading map…',
    spotsSummary: '{count} spots on the map',
    openGuide: 'What’s on the map',
    closeGuide: 'Close',
    tapSpot: 'Tap a coloured spot to see what was reported there',
    spotWhen: 'When',
    spotType: 'Type',
  },
  report: {
    title: 'Anonymous report',
    notDocket: 'This is not a police docket. It does not replace 10111.',
    pickPlace: 'Tap the map to mark the area (snaps to a short stretch, not a house).',
    useLocation: 'Use my approximate location',
    category: 'What happened',
    role: 'Who is reporting',
    roleSelf: 'It happened to me',
    roleBystander: 'I saw it',
    roleOther: 'Someone I know',
    timeBand: 'Time of day',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    night: 'Night',
    incidentDate: 'Date (optional)',
    whatHappened: 'What happened (optional, no names)',
    redFlag: 'Red-flag phrase (optional)',
    redFlagOther: 'Other (no names)',
    vehicle: 'Vehicle (optional)',
    vehicleColor: 'Colour',
    vehicleType: 'Type (e.g. bakkie)',
    vehicleDirection: 'Direction',
    involvesMinor: 'This involves a child / minor',
    minorNote:
      'If a child is at risk: call Childline 116 or SAPS FCS. Public map shows a count only — no story.',
    remainsNote:
      'If you found possible remains: call 10111 first. The map only shows area + time.',
    unsafeNote:
      'Your story stays in your private notebook. Only the area count goes on the map.',
    saveNotebook: 'Also save story to my private notebook on this device',
    submit: 'Publish to map',
    submitting: 'Sending…',
    success: 'On the map. Thank you.',
    needPlace: 'Please mark a place on the map.',
    needCategory: 'Please choose a category.',
    noNames:
      'No names, surnames, phone numbers, number plates, schools, or workplaces.',
  },
  notebook: {
    title: 'Private notebook',
    subtitle:
      'Stays on this phone/browser only. The Voices never receives these words. Export a PDF if you need a timeline for a magistrate or someone you trust.',
    add: 'Add entry',
    date: 'Date',
    what: 'What was said or done',
    scared: 'I was scared',
    phone: 'Phone was taken / demanded',
    area: 'Area note (optional)',
    export: 'Download PDF',
    empty: 'No entries yet.',
    delete: 'Delete',
    saved: 'Saved on this device.',
  },
  about: {
    title: 'About The Voices',
    body1:
      'The Voices maps places and patterns so women and children can see where reports cluster. We do not publish names, surnames, faces, number plates, schools, or workplaces.',
    body2:
      'The private notebook is yours alone. We do not read it. Area petitions ask for lights and patrols — not for anonymous arrests.',
    hardNos: 'Hard nos',
    nos: [
      'No names or nicknames',
      'No photos of people',
      'No apology videos',
      'No “confirm this person” buttons',
      'No house addresses',
    ] as string[],
    role: 'If you run this site: hide leaked identity rows in the database. Never store private notebook data on the server. Purple here is used in solidarity with the Purple Movement and the work women have done to make GBV impossible to ignore — The Voices is not an official Women for Change product.',
  },
  categories: {
    followed: 'Followed / circled',
    grabbed: 'Grabbed / blocked',
    harassment: 'Harassment / shouted at',
    lift_wrong: 'Lift that felt wrong',
    red_flag: 'Red-flag things said',
    unsafe_around_someone: 'Unsafe around someone',
    missing: 'Missing / last seen',
    possible_remains: 'Possible remains',
    body_dump: 'Publicly reported body / dump site',
  },
}

/** Same shape as English; values are free strings for translations */
export type Dict = {
  [K in keyof typeof en]: (typeof en)[K] extends string
    ? string
    : (typeof en)[K] extends string[]
      ? string[]
      : {
          [P in keyof (typeof en)[K]]: (typeof en)[K][P] extends string
            ? string
            : (typeof en)[K][P] extends string[]
              ? string[]
              : string
        }
}
