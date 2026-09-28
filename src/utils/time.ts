export function formatDuration(totalSeconds: number) {
    const hours = Math.floor(totalSeconds / 3600);
  
    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    );
  
    const seconds = totalSeconds % 60;
  
    return [
      hours.toString().padStart(2, "0"),
      minutes.toString().padStart(2, "0"),
      seconds.toString().padStart(2, "0"),
    ].join(":");
  }
  
  export function getElapsedSeconds(
    startTime: string
  ) {
    const start = new Date(startTime).getTime();
  
    const now = Date.now();
  
    return Math.max(
      0,
      Math.floor((now - start) / 1000)
    );
  }
  
  export function getWeekStartDate() {
    const today = new Date();
  
    const day = today.getDay();
  
    // Sunday = 0, Monday = 1
    const daysFromMonday = day === 0 ? 6 : day - 1;
  
    const monday = new Date(today);
  
    monday.setDate(
      today.getDate() - daysFromMonday
    );
  
    monday.setHours(0, 0, 0, 0);
  
    const year = monday.getFullYear();
  
    const month = String(
      monday.getMonth() + 1
    ).padStart(2, "0");
  
    const date = String(
      monday.getDate()
    ).padStart(2, "0");
  
    return `${year}-${month}-${date}`;
  }
  