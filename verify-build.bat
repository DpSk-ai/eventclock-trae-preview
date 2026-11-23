@echo off
echo ========================================
echo EventClock V2 - Build Verification
echo ========================================
echo.

echo [1/3] Running TypeScript type check...
call npm run typecheck
if %errorlevel% neq 0 (
    echo ERROR: Type check failed!
    pause
    exit /b 1
)
echo Type check passed!
echo.

echo [2/3] Running tests...
call npm run test
if %errorlevel% neq 0 (
    echo ERROR: Tests failed!
    pause
    exit /b 1
)
echo Tests passed!
echo.

echo [3/3] Building production bundle...
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Build failed!
    pause
    exit /b 1
)
echo Build successful!
echo.

echo ========================================
echo All checks passed! dist/ generated.
echo ========================================
pause
