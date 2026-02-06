#!/usr/bin/env expect
# Gemini CLI automation with auto-auth, confirmation, and retry logic

set timeout -1
set max_retries 50
set retry_count 0
set delay_seconds 10

# Use environment override or default to 'gemini'
if {[info exists env(GEMINI_CMD)] && $env(GEMINI_CMD) ne ""} {
  set gemini_cmd $env(GEMINI_CMD)
} else {
  set gemini_cmd "gemini"
}

# Launch Gemini
spawn -noecho {*}$gemini_cmd
after 600
send "/auth\r"

# -- AUTH FLOW --
set saw_url 0
while {1} {
  expect {
    -re {https?://[^\s]+} {
      set url $expect_out(0,string)
      if {!$saw_url} {
        set saw_url 1
        send_user "\n[Auth] Opening login URL in browser: $url\n"
        catch { exec open $url }
        send_user "[Auth] Press Enter here after completing login...\n"
        expect_user -re "\n"
        send "\r"
      }
      exp_continue
    }

    -re {(?i)(press\s+enter|hit\s+enter).*} {
      send_user "[Auth] Login pending. Press Enter here when ready...\n"
      expect_user -re "\n"
      send "\r"
      exp_continue
    }

    -re {(?i)(authentication\s+(successful|complete)|you are now authenticated)} {
      send_user "\n[Auth] Authentication complete. Starting interactive handler.\n"
      break
    }

    eof {
      send_user "\n[Error] Gemini exited unexpectedly.\n"
      exit 1
    }

    timeout {
      send_user "\n[Error] Timeout during authentication.\n"
      exit 1
    }
  }
}

# -- INTERACTIVE MODE: Custom Handlers --
interact \
  # Permission menu: auto-select "2. Allow for this session"
  -o -re {(?i)1\.\s*Allow once(.|\r|\n)*2\.\s*Allow for this session(.|\r|\n)*3\.\s*No,\s*suggest changes} {
    send_user "\n[Prompt] Permission detected — selecting option 2 (Allow for this session)\n"
    send "2\r"
  } \
  \
  # High demand: auto-select "1. Keep trying" with delay and retry count
  -o -re {(?i)1\.\s*Keep trying(.|\r|\n)*2\.\s*Stop} {
    if {$retry_count < $max_retries} {
      incr retry_count
      send_user "\n[Retry] High demand. Attempt #$retry_count — retrying in $delay_seconds seconds...\n"
      after [expr {$delay_seconds * 1000}]
      send "1\r"
    } else {
      send_user "\n[Abort] Reached max retry limit ($max_retries). Not retrying further.\n"
    }
  } \
  \
  # Generic yes/no confirmations
  -o -re {(?i)\[[[:space:]]*(y/n|yes/no|y/N|Y/n)[[:space:]]*\]} { send "y\r" } \
  -o -re {(?i)\([[:space:]]*(y/n|yes/no|y/N|Y/n)[[:space:]]*\)} { send "y\r" } \
  -o -re {(?i)\bcontinue\?\b} { send "y\r" } \
  -o -re {(?i)\bproceed\?\b}  { send "y\r" } \
  \
  # Press Enter prompts
  -o -re {(?i)press[[:space:]]+enter[[:space:]]+to[[:space:]]+continue} { send "\r" } \
  -o -re {(?i)press[[:space:]]+return[[:space:]]+to[[:space:]]+continue} { send "\r" }

