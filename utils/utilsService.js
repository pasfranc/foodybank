export function generateRandomId(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

export function isTimestampFromToday(timestamp) {
    // Create a Date object from the timestamp
    console.log(timestamp)
    const date = new Date(timestamp);

    // Get the current date
    const currentDate = new Date();

    console.log(date.getFullYear() === currentDate.getFullYear())

    // Compare the year, month, and day of both dates
    return (
        date.getFullYear() === currentDate.getFullYear() &&
        date.getMonth() === currentDate.getMonth() &&
        date.getDay() === currentDate.getDay()
    );
}

export function isTimestampAfterToday(timestamp) {
    // Create a Date object from the timestamp
    const date = new Date(timestamp);

    // Get the current date
    const currentDate = new Date();

    // Set the current date to the end of the day (23:59:59)
    currentDate.setHours(23, 59, 59, 999);

    // Compare the dates
    return date > currentDate;
}