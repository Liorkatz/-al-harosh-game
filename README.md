# על הראש — משחק ניחושים בעברית

משחק ווב/PWA קבוצתי בעברית, בהשראת מנגנון משחקי forehead-charades: שחקן מחזיק את הטלפון לרוחב על המצח, החברים נותנים רמזים, והטיית המכשיר מסמנת תשובה נכונה או דילוג.

## מה כלול

- 12 חבילות בעברית, 719 מילים וביטויים.
- הטיה באמצעות `DeviceOrientationEvent`.
- תמיכה בהרשאת חיישנים ב-iPhone/iPad מתוך לחיצת משתמש.
- כפתורי `נכון` / `דלג` כגיבוי.
- טיימר 30/60/90/120 שניות.
- אפשרות לקנס נקודה על דילוג.
- חבילה אישית הנשמרת ב-Local Storage.
- מסך תוצאות עם כל המילים שנענו/דולגו.
- Screen Wake Lock כשהדפדפן תומך.
- PWA + Service Worker לשימוש אופליין אחרי טעינה ראשונה.
- אין שרת, אין מסד נתונים ואין תהליך build.

## חוקי המשחק

1. בוחרים חבילת מילים וזמן לסיבוב.
2. המנחש מחזיק את הטלפון לרוחב על המצח כאשר המסך פונה לחברים.
3. החברים נותנים רמזים בלי לומר את המילה עצמה.
4. ניחוש נכון: מטה את הטלפון כלפי מטה.
5. דילוג: מטה לכיוון ההפוך.
6. המטרה היא לצבור כמה שיותר תשובות נכונות עד סוף הזמן.

## פרסום ב-GitHub Pages

הפרויקט כולל workflow אוטומטי תחת `.github/workflows/pages.yml`. לאחר הפעלת GitHub Pages עבור הריפו ובחירת GitHub Actions כמקור, כל push ל-`main` יפרסם את המשחק אוטומטית.

GitHub Pages מספק HTTPS, שנדרש עבור APIs של חיישני תנועה בחלק מהדפדפנים.

## התאמת חבילות

כל מאגר המילים נמצא בקובץ `words.js`. אפשר להוסיף חבילה בפורמט:

```js
{
  id: "my-deck",
  name: "החבילה שלי",
  icon: "🎯",
  words: ["מילה 1", "מילה 2", "מילה 3"]
}
```

## בדיקת חיישן ההטיה

המשחק מחכה למצב לרוחב שבו `|gamma|` קרוב ל-90°. כאשר המכשיר חוזר מעל 60° המחווה נדרכת מחדש; מעבר לאזור של עד 30° מפעיל `נכון` או `דלג` בהתאם לצד שבו המכשיר מוחזק. קיימת חסימת debounce כדי לא לספור אותה מחווה פעמיים.

## מקורות ששימשו להבנת המכניקה וה-API

- Heads Up! — App Store: https://apps.apple.com/us/app/heads-up/id623592465
- Wait Up! — open-source implementation: https://github.com/sdennett55/headsup
- MDN DeviceOrientationEvent.requestPermission(): https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static
- MDN Device Orientation Events: https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events
- MDN Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API

הפרויקט כאן הוא מימוש עצמאי ואינו משתמש בשם, בגרפיקה, במאגרי מילים או בקוד של Heads Up!.
