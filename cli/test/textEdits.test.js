const { test } = require('node:test');
const assert = require('node:assert');
const { setApplicationId, setManifestPackage, setAppName, setLauncherIcon } = require('../lib/textEdits');

test('setApplicationId 替换单/双引号 applicationId', () => {
  assert.match(setApplicationId("        applicationId 'com.chances.shell'", 'com.foo.bar'),
    /applicationId 'com\.foo\.bar'/);
  assert.match(setApplicationId('    applicationId "com.chances.shell"', 'com.foo.bar'),
    /applicationId 'com\.foo\.bar'/);
});

test('setManifestPackage 替换 manifest 根 package', () => {
  const xml = '<manifest xmlns:android="x"\n    package="com.chances.shell">';
  assert.match(setManifestPackage(xml, 'com.foo.bar'), /package="com\.foo\.bar"/);
});

test('setAppName 替换 app_name', () => {
  const xml = '<string name="app_name">Shell Template</string>';
  assert.strictEqual(setAppName(xml, '旅游助手'), '<string name="app_name">旅游助手</string>');
});

test('setLauncherIcon 替换 android:icon', () => {
  const xml = '        android:icon="@android:drawable/sym_def_app_icon"';
  assert.match(setLauncherIcon(xml, 'ic_launcher_tour'), /android:icon="@mipmap\/ic_launcher_tour"/);
});
