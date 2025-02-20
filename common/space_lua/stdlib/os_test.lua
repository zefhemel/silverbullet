local function assert_equal(a, b)
    if a ~= b then
        error("Assertion failed: " .. a .. " is not equal to " .. b)
    end
end

-- Basic OS functions
assert(os.time() > 0)
assert(os.date("%Y-%m-%d", os.time({ year = 2020, month = 1, day = 1 })) == "2020-01-01")

-- Week calculations
assert(os.date("%U %V %W", os.time({ year = 2051, month = 1, day = 1 })) == "01 52 00")
assert(os.date("%U %V %W", os.time({ year = 2025, month = 2, day = 18})) == "07 08 07")
