/**
 * Determines if a post should be published based on its pubDate.
 * Posts are published at 8 AM Central Time (America/Chicago) on their publication date.
 */
export function isPostPublished(pubDate: Date): boolean {
  const now = new Date();
  const publishTime = getPublishTime(pubDate);
  return now >= publishTime;
}

/**
 * Gets the actual publish datetime for a post (8 AM Central on the pubDate)
 */
export function getPublishTime(pubDate: Date): Date {
  // Get the year, month, day from the pubDate
  const year = pubDate.getFullYear();
  const month = pubDate.getMonth();
  const day = pubDate.getDate();
  
  // Determine if DST is in effect for Central Time on this date
  // Central Standard Time is UTC-6, Central Daylight Time is UTC-5
  // DST in US starts 2nd Sunday of March, ends 1st Sunday of November
  const targetDate = new Date(year, month, day);
  
  // Simple DST check for US Central Time
  const marchSecondSunday = getNthSundayOfMonth(year, 2, 2); // March (2), 2nd Sunday
  const novemberFirstSunday = getNthSundayOfMonth(year, 10, 1); // November (10), 1st Sunday
  
  const isDST = targetDate >= marchSecondSunday && targetDate < novemberFirstSunday;
  
  // Central Time offset from UTC: -6 hours (CST) or -5 hours (CDT)
  const centralOffsetHours = isDST ? -5 : -6;
  
  // Create UTC time for 8 AM Central
  // If it's 8 AM Central (UTC-6), that's 14:00 UTC
  // If it's 8 AM Central (UTC-5 DST), that's 13:00 UTC
  const utcHour = 8 - centralOffsetHours; // 8 - (-6) = 14, or 8 - (-5) = 13
  
  return new Date(Date.UTC(year, month, day, utcHour, 0, 0, 0));
}

/**
 * Get the nth Sunday of a given month
 */
function getNthSundayOfMonth(year: number, month: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  const dayOfWeek = firstDay.getDay(); // 0 = Sunday
  const firstSunday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nthSunday = firstSunday + (n - 1) * 7;
  return new Date(year, month, nthSunday, 2, 0, 0, 0); // DST changes at 2 AM
}
