import UIKit
import XCTest

final class MobileFormattingKeyboardTests: XCTestCase {
  func testRichFormattingDismissalAndDraftSurviveRotation() throws { try verify(mode: "wysiwyg") }
  func testSourceFormattingDismissalAndDraftSurviveRotation() throws { try verify(mode: "source") }

  private func verify(mode: String) throws {
    try XCTSkipIf(UIDevice.current.userInterfaceIdiom == .pad, "Phone-specific compact toolbar")
    continueAfterFailure = false
    XCUIDevice.shared.orientation = .portrait
    let app = XCUIApplication(bundleIdentifier: "com.tolaria.mobile.dev")
    app.launchArguments = ["--tolaria-mobile-search", "?source=fixture&phoneState=list&editorMode=\(mode)&qaRun=phone-format-keyboard"]
    app.launch()
    defer { app.terminate() }
    let create = element(app, "note-list-create-action")
    XCTAssertTrue(create.waitForExistence(timeout: 30))
    create.tap()
    let input = mode == "source" ? element(app, "editor-markdown-input") : app.webViews.textViews.firstMatch
    XCTAssertTrue(input.waitForExistence(timeout: 15))
    input.tap()
    app.typeText("Phone formatting draft")
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 8))
    assertDismissTarget(app)
    attachScreen("\(mode)-portrait-keyboard")
    XCUIDevice.shared.orientation = .landscapeLeft
    waitUntil { app.frame.width > app.frame.height }
    assertDismissTarget(app)
    let headings = element(app, "editor-format-menu-headings")
    XCTAssertTrue(headings.isHittable)
    headings.tap()
    let heading = element(app, "editor-format-heading-2")
    XCTAssertTrue(heading.waitForExistence(timeout: 5))
    heading.tap()
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 8))
    app.typeText(" landscape")
    attachScreen("\(mode)-landscape-caret")
    element(app, "editor-hide-keyboard-action").tap()
    XCTAssertTrue(app.keyboards.firstMatch.waitForNonExistence(timeout: 8))
    XCTAssertTrue(element(app, "editor-hide-keyboard-action").waitForNonExistence(timeout: 5))
    let stayedHidden = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in app.keyboards.firstMatch.exists }, object: nil)
    stayedHidden.isInverted = true
    wait(for: [stayedHidden], timeout: 2)
    XCUIDevice.shared.orientation = .portrait
    waitUntil { app.frame.height > app.frame.width }
    input.tap()
    XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 8))
    app.typeText(" resumed")
    attachScreen("\(mode)-portrait-resumed-caret")
    assertSourceDraft(app, mode: mode)
  }

  private func assertSourceDraft(_ app: XCUIApplication, mode: String) {
    if mode != "source" { element(app, "editor-source-action").tap() }
    let source = element(app, "editor-markdown-input")
    XCTAssertTrue(source.waitForExistence(timeout: 8))
    let text = source.value as? String ?? ""
    XCTAssertTrue(text.contains("Phone formatting draft"))
    XCTAssertTrue(text.contains("landscape"))
    XCTAssertTrue(text.contains("resumed"))
    XCTAssertTrue(text.contains("type: Note"))
    XCTAssertTrue(text.contains("## "))
  }

  private func assertDismissTarget(_ app: XCUIApplication) {
    let button = element(app, "editor-hide-keyboard-action")
    XCTAssertTrue(button.waitForExistence(timeout: 5))
    XCTAssertTrue(button.isHittable)
    XCTAssertGreaterThanOrEqual(button.frame.width, 43.99)
    XCTAssertGreaterThanOrEqual(button.frame.height, 43.99)
    XCTAssertTrue(app.frame.contains(button.frame))
    let keyboard = app.keyboards.firstMatch
    let surfaces = [keyboard, app.buttons["assistantUndo"], app.otherElements["Typing Predictions"]]
    let top = surfaces.filter { $0.exists }.map { $0.frame.minY }.min() ?? keyboard.frame.minY
    waitUntil { button.frame.maxY <= top + 2 }
  }

  private func element(_ app: XCUIApplication, _ id: String) -> XCUIElement {
    app.descendants(matching: .any).matching(identifier: id).firstMatch
  }

  private func waitUntil(_ condition: @escaping () -> Bool) {
    let ready = XCTNSPredicateExpectation(predicate: NSPredicate { _, _ in condition() }, object: nil)
    XCTAssertEqual(XCTWaiter.wait(for: [ready], timeout: 8), .completed)
  }

  private func attachScreen(_ name: String) {
    let image = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
    image.name = name
    image.lifetime = .keepAlways
    add(image)
  }
}
