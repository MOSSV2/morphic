import re
from playwright.sync_api import sync_playwright, Page, expect

def verify_stats_page(page: Page):
    """
    This test verifies that the stats page renders correctly with the new charts.
    """
    # 1. Arrange: Go to the stats page.
    page.goto("http://localhost:3000/stats", timeout=60000)

    # Wait for the network to be idle, meaning all resources are loaded.
    page.wait_for_load_state('networkidle')

    # 2. Assert: Wait for the main heading to be visible.
    heading = page.get_by_role("heading", name="Statistics Dashboard")
    expect(heading).to_be_visible(timeout=10000)

    # 3. Assert: Wait for the charts to be visible.
    # We can check for the presence of the chart containers.
    hourly_chart = page.locator('.recharts-wrapper').first
    expect(hourly_chart).to_be_visible()

    daily_chart = page.locator('.recharts-wrapper').last
    expect(daily_chart).to_be_visible()

    # 4. Screenshot: Capture the final result for visual verification.
    page.screenshot(path="jules-scratch/verification/stats-page.png")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        verify_stats_page(page)
        browser.close()

if __name__ == "__main__":
    main()
