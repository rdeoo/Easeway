import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';

const uiUrl = new URL('../src/components/ui.tsx', import.meta.url).href;
const hostUrl = 'test:feedback-host';
// Use React's real renderer with lightweight platform hosts; no browser/native runtime needed.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL === uiUrl) {
      if (['react-native', 'expo-linear-gradient', '@expo/vector-icons'].includes(specifier)) {
        return { url: hostUrl, shortCircuit: true };
      }
      if (specifier === '../constants/theme') {
        return nextResolve(new URL('../src/constants/theme.ts', import.meta.url).href, context);
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === uiUrl) return {
      format: 'module', shortCircuit: true,
      source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
      }).outputText,
    };
    if (url === hostUrl) return {
      format: 'module', shortCircuit: true,
      source: `
        import { createElement } from ${JSON.stringify(import.meta.resolve('react'))};
        const host = tag => ({ children, accessibilityRole, disabled }) =>
          createElement(tag, { 'data-role': accessibilityRole, disabled: tag === 'button' ? disabled : undefined }, children);
        export const View = host('div'), Text = host('span'), Pressable = host('button');
        export const TextInput = host('input'), LinearGradient = host('div');
        export const Ionicons = () => null;
        export const StyleSheet = { create: styles => styles };
        export const Modal = ({ visible, children }) => visible ? createElement('section', null, children) : null;
      `,
    };
    return nextLoad(url, context);
  },
});
const { MessageBanner, ConfirmationDialog } = await import(uiUrl);
after(() => hooks.deregister());
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test('message banner renders nothing when there is no message', () => {
  assert.equal(render(MessageBanner, { message: '' }), '');
  assert.equal(render(MessageBanner, {}), '');
});

test('local and Supabase errors use the same banner and preserve their exact text', () => {
  for (const message of ['Use a password with at least 8 characters.', 'Invalid login credentials']) {
    const markup = render(MessageBanner, { message, tone: 'error' });
    assert.ok(markup.includes(message));
    assert.ok(markup.includes('data-role="alert"'));
  }
});

test('success and information banners display conditional feedback without an error role', () => {
  for (const tone of ['success', 'info']) {
    const markup = render(MessageBanner, { message: 'Commute saved.', tone, onDismiss() {} });
    assert.ok(markup.includes('Commute saved.'));
    assert.ok(!markup.includes('data-role="alert"'));
    assert.ok(markup.includes('<button'));
  }
});

test('delete popup is hidden until opened and includes the named commute and failure', () => {
  const props = {
    title: 'Delete commute?', description: 'Delete Night School?', busy: false,
    onConfirm() {}, onCancel() {},
  };
  assert.equal(render(ConfirmationDialog, { ...props, visible: false }), '');
  const markup = render(ConfirmationDialog, { ...props, visible: true, error: 'Could not delete commute.' });
  for (const text of ['Delete commute?', 'Delete Night School?', 'Cancel', 'Delete', 'Could not delete commute.']) {
    assert.ok(markup.includes(text));
  }
});

test('delete popup disables both actions while deleting', () => {
  const markup = render(ConfirmationDialog, {
    visible: true, title: 'Delete?', description: 'Night School', busy: true,
    onConfirm() {}, onCancel() {},
  });
  assert.ok(markup.includes('Deleting...'));
  assert.equal((markup.match(/disabled=""/g) ?? []).length, 2);
});

test('shared popup supports edit confirmation without a delete action', () => {
  const markup = render(ConfirmationDialog, {
    visible: true, title: 'Edit commute?', description: 'Edit Night School?', busy: false,
    confirmLabel: 'Continue editing', destructive: false, onConfirm() {}, onCancel() {},
  });
  for (const text of ['Edit commute?', 'Edit Night School?', 'Continue editing', 'Cancel']) {
    assert.ok(markup.includes(text));
  }
  assert.ok(!markup.includes('Delete'));
});
