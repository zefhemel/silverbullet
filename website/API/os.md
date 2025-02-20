API docs for Lua's `os` module.

## os.time(table?)
Returns the current time when called without arguments, or a timestamp for a specific date when given a table. The table can contain the following fields: year (required), month (required), day (required), hour (defaults to 12), min (defaults to 0), and sec (defaults to 0).

Example:
```lua
-- Get current timestamp
print(os.time())  -- prints: current Unix timestamp

-- Get timestamp for specific date
local timestamp = os.time({
    year = 2020,
    month = 1,
    day = 1
})
```

## os.date(format?, timestamp?)
Returns a string or table containing date and time, formatted according to the given format string. If timestamp is not provided, formats the current time.

Format specifiers:
- `%Y`: Full year (e.g., "2024")
- `%y`: Year without century (e.g., "24")
- `%m`: Month (01-12)
- `%b`: Abbreviated month name (e.g., "Jan")
- `%B`: Full month name (e.g., "January")
- `%d`: Day of month (01-31)
- `%e`: Day of month (1-31)
- `%H`: Hour (00-23)
- `%I`: Hour (01-12)
- `%M`: Minute (00-59)
- `%S`: Second (00-59)
- `%p`: AM/PM
- `%A`: Full weekday name (e.g., "Sunday")
- `%a`: Abbreviated weekday name (e.g., "Sun")
- `%w`: Weekday (0-6, Sunday is 0)
- `%U`: Week of the year, starting with the first Sunday as the first day of week 01 (00-53)
- `%W`: Week of the year, starting with the first Monday as the first day of week 01 (00-53)
- `%V`: ISO 8601 week of the year (01-53) (see [Wikipedia](https://en.wikipedia.org/wiki/ISO_week_date))
- `%j`: Day of year (001-366)
- `%Z`: Time zone name
- `%z`: Time zone offset from UTC
- `%%`: Literal "%"

Example:
```lua
-- Format specific date
local date = os.date("%Y-%m-%d", os.time({
    year = 2020,
    month = 1,
    day = 1
}))
print(date)  -- prints: 2020-01-01

-- Current date in different formats
print(os.date("%Y-%m-%d"))         -- prints: current date (e.g., "2024-03-14")
print(os.date("%B %d, %Y"))        -- prints: month day, year (e.g., "March 14, 2024")
print(os.date("%I:%M %p"))         -- prints: time in 12-hour format (e.g., "02:30 PM")
print(os.date("%A, %B %d, %Y"))    -- prints: full date (e.g., "Thursday, March 14, 2024")
``` 