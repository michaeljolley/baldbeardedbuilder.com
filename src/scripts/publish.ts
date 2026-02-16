/**
 * Determines if a post should be published based on its pubDate.
 * Posts are published at 8 AM Central Time (America/Chicago) on their publication date.
 */
export function isPostPublished(pubDate: Date): boolean {
  const now = new Date();
  
  // Get the publication datetime at 8 AM Central
  const publishTime = getPublishTime(pubDate);
  
  return now >= publishTime;
}

/**
 * Gets the actual publish datetime for a post (8 AM Central on the pubDate)
 */
export function getPublishTime(pubDate: Date): Date {
  // Create a date string in Central Time for 8 AM on the pubDate
  const year = pubDate.getFullYear();
  const month = String(pubDate.getMonth() + 1).padStart(2, '0');
  const day = String(pubDate.getDate()).padStart(2, '0');
  
  // Format: YYYY-MM-DDTHH:MM:SS in Central Time
  const centralDateStr = `${year}-${month}-${day}T08:00:00`;
  
  // Create a formatter to get the UTC offset for Central Time on that date
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Get the offset by comparing local interpretation
  // Create a date at 8 AM Central by using the timezone-aware approach
  const tempDate = new Date(pubDate);
  tempDate.setHours(8, 0, 0, 0);
  
  // Get what 8 AM Central looks like in UTC
  const parts = formatter.formatToParts(tempDate);
  const centralHour = parseInt(parts.find(p => p.type === 'hour')?.value || '8');
  
  // Calculate the offset (Central is UTC-6 or UTC-5 depending on DST)
  // We'll use a more reliable method: create the date in Central and convert
  const publishDate = new Date(pubDate);
  publishDate.setHours(8, 0, 0, 0);
  
  // Adjust for Central Time offset
  // Central Standard Time is UTC-6, Central Daylight Time is UTC-5
  const jan = new Date(publishDate.getFullYear(), 0, 1);
  const jul = new Date(publishDate.getFullYear(), 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const isDst = publishDate.getTimezoneOffset() < stdOffset;
  
  // Central Time offset in minutes: -360 (CST) or -300 (CDT)
  const centralOffset = isDst ? -300 : -360;
  const localOffset = publishDate.getTimezoneOffset();
  
  // Adjust the time to account for the difference between local and Central
  const offsetDiff = localOffset - (-centralOffset);
  publishDate.setMinutes(publishDate.getMinutes() + offsetDiff);
  
  return publishDate;
}
