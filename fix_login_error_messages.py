import sys

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 fix_login_error_messages.py affiliate-login.html")
        sys.exit(1)

    path = sys.argv[1]
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    edits = []

    old1 = '''    btn.disabled = true; btn.textContent = 'Signing in...';
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'affiliate-dashboard.html';
    } catch (err) {
      errEl.textContent = 'Incorrect email or password. Please try again.';
      errEl.classList.add('show');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  };'''
    new1 = '''    btn.disabled = true; btn.textContent = 'Signing in...';
    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'affiliate-dashboard.html';
    } catch (err) {
      // Real fix: this always showed the same generic message before,
      // regardless of the actual Firebase error, which made a rate-limit
      // lockout look identical to a genuinely wrong password. Logging
      // the real code/message so it is visible in the browser console,
      // and branching the on-screen text for the cases that need a
      // different action from the person signing in.
      console.error('handleLogin error:', err.code, err.message);
      if (err.code === 'auth/too-many-requests') {
        errEl.textContent = 'Too many failed attempts. Please wait a few minutes and try again, or use "Forgot your password?" to reset it immediately.';
      } else if (err.code === 'auth/user-disabled') {
        errEl.textContent = 'This account has been disabled. Contact us for help.';
      } else if (err.code === 'auth/invalid-email') {
        errEl.textContent = 'That email address doesn' + String.fromCharCode(39) + 't look right.';
      } else {
        errEl.textContent = 'Incorrect email or password. Please try again.';
      }
      errEl.classList.add('show');
      btn.disabled = false; btn.textContent = 'Sign In';
    }
  };'''
    edits.append(('surface real error code in handleLogin', old1, new1))

    old2 = '''      await sendPasswordResetEmail(auth, email, { url: 'https://amenityfit.app/affiliate-login.html', handleCodeInApp: true });
      errEl.style.background = '#F0FDF4';
      errEl.style.borderColor = '#BBF7D0';
      errEl.style.color = '#166534';
      errEl.textContent = 'If that email has an account, a reset link has been sent.';
      errEl.classList.add('show');
    } catch (err) {
      errEl.textContent = 'If that email has an account, a reset link has been sent.';
      errEl.classList.add('show');
    }
  };'''
    new2 = '''      await sendPasswordResetEmail(auth, email, { url: 'https://amenityfit.app/affiliate-login.html', handleCodeInApp: true });
      errEl.style.background = '#F0FDF4';
      errEl.style.borderColor = '#BBF7D0';
      errEl.style.color = '#166534';
      errEl.textContent = 'If that email has an account, a reset link has been sent.';
      errEl.classList.add('show');
    } catch (err) {
      // Same real-error logging as handleLogin above - the on-screen
      // message deliberately stays generic either way (so this never
      // reveals whether an email has an account), but the true failure
      // reason is now visible in the browser console for debugging.
      console.error('handleForgotPassword error:', err.code, err.message);
      errEl.textContent = 'If that email has an account, a reset link has been sent.';
      errEl.classList.add('show');
    }
  };'''
    edits.append(('log real error in handleForgotPassword', old2, new2))

    for label, old, new in edits:
        count = content.count(old)
        if count != 1:
            print(f"ABORTED before writing: '{label}' matched {count} times (expected exactly 1). No changes were made to the file.")
            sys.exit(1)

    for label, old, new in edits:
        content = content.replace(old, new)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"Applied {len(edits)} edits successfully to {path}")
    for label, _, _ in edits:
        print(f"  - {label}")

if __name__ == '__main__':
    main()
