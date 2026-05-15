#!/usr/bin/env python3
"""SSH helper using pexpect for password-based authentication."""
import pexpect
import sys
import os

HOST = "192.168.1.161"
USER = "dustin"
PASSWORD = "sudnav@1924"

def ssh_run(command, timeout=120):
    """Execute a command on remote host via SSH with password auth."""
    child = pexpect.spawn(f"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 {USER}@{HOST} {command}")
    idx = child.expect([b"[Pp]assword:", pexpect.EOF, pexpect.TIMEOUT], timeout=30)
    if idx == 0:
        child.sendline(PASSWORD.encode())
        idx = child.expect([pexpect.EOF, pexpect.TIMEOUT], timeout=timeout)
    child.close()
    return child.exitstatus

def ssh_interactive(command, timeout=60):
    """Run interactive SSH command, printing output in real-time."""
    child = pexpect.spawn(f"ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 {USER}@{HOST} {command}")
    child.logfile_read = sys.stdout.buffer
    idx = child.expect([b"[Pp]assword:", pexpect.EOF, pexpect.TIMEOUT], timeout=30)
    if idx == 0:
        child.sendline(PASSWORD.encode())
        child.expect([pexpect.EOF, pexpect.TIMEOUT], timeout=timeout)
    child.close()
    return child.exitstatus

def sftp_upload(local_path, remote_path):
    """Upload a file via SFTP with password auth."""
    child = pexpect.spawn(f"sftp -o StrictHostKeyChecking=no {USER}@{HOST}")
    child.logfile_read = sys.stdout.buffer
    idx = child.expect([b"[Pp]assword:", pexpect.EOF, pexpect.TIMEOUT], timeout=30)
    if idx == 0:
        child.sendline(PASSWORD.encode())
        child.expect(b"sftp>", timeout=15)
        child.sendline(f"put {local_path} {remote_path}".encode())
        child.expect(b"sftp>", timeout=30)
        child.sendline(b"bye")
    child.close()
    return child.exitstatus

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: deploy_ssh.py <run|exec|upload> <args...>")
        sys.exit(1)
    
    action = sys.argv[1]
    args = " ".join(sys.argv[2:])
    
    if action == "run":
        sys.exit(ssh_interactive(args))
    elif action == "exec":
        sys.exit(ssh_run(args))
    elif action == "upload":
        parts = args.split(" ", 1)
        if len(parts) == 2:
            sys.exit(sftp_upload(parts[0], parts[1]))
        else:
            print("Upload needs: local_path remote_path")
            sys.exit(1)
    else:
        print(f"Unknown action: {action}")
        sys.exit(1)
