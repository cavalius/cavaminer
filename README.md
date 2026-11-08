<img src="logo.svg" alt="CavaMiner" width="300">

CavaMiner is a cryptocurrency miner for **PearlHash** (Pearl, PRL) on
NVIDIA GPUs and **RandomX** (Monero, XMR) on CPUs. One process can mine
both.

- **Fast.** Hand-written CUDA kernels for the RTX 30, 40 and 50 series,
  within a few percent of the fastest closed-source miner; safe
  auto-tuning, undervolting with self-checks, power sweeps.
- **Mines when power is cheap.** Follows the electricity price from 38
  sources in about 40 countries (Danish grid tariffs included), runs the
  cheapest hours of the day, switches profiles on a cron schedule, and
  pauses while other programs use a GPU.
- **Yours to watch and control.** A terminal menu, a web interface with
  your own dashboards and statistics, two-factor logins, a REST API,
  Prometheus metrics and a Home Assistant integration. Every setting can be
  changed from every one of them and from the command line.
- **Dev fee:** 1 % of the PearlHash and of the RandomX mining time pays
  for further development (details below).

Status: beta. Linux and Windows on x86-64, with NVIDIA GPUs of the RTX 30,
40 and 50 series (sm_86, sm_89, sm_120) and any x86-64 CPU; tested on the
pools listed below. Downloads and this documentation:
https://cavaminer.cavalius.net — bug reports and requests:
https://github.com/cavalius/cavaminer/issues

## Requirements and installation

| | |
|---|---|
| Linux | x86-64 with glibc 2.17 or newer (any distribution of the last ten years); everything below works |
| Windows | Windows 10 or 11, x64, one `cavaminer.exe`; PearlHash and RandomX mine as on Linux (see Windows below for what differs: the program is not code-signed yet, so Windows 11's Smart App Control blocks it; large pages need a right of the account, there is no MSR tweak, no CPU clock cap and no CPU power reading) |
| PearlHash | An NVIDIA GPU of the RTX 30, 40 or 50 series and an NVIDIA driver 525 or newer (RTX 50 series: 575 or newer; 580 or newer runs the kernels built with CUDA 13, which are 1.7 % faster on the RTX 50 series). The CUDA toolkit is not needed: the kernels are inside the miner |
| RandomX | Any x86-64 CPU; AES and AVX2 help. 2 MiB huge pages, about 2.5 GB of memory |
| Root / administrator | Needed for everything that touches the hardware: power limits, clocks, the clock offset, huge pages, the MSR tweak and the CPU clock cap. Mining itself, the menu, the web interface and the statistics work without it |

Every release offers:

| file | |
|---|---|
| `cavaminer-<version>-linux-x86_64.tar.gz` | Linux, the full package: the miner, this README, the license and the third-party notices, and the Home Assistant integration |
| `cavaminer-<version>-linux-x86_64` | Linux, the bare binary; make it executable (`chmod +x`) |
| `cavaminer-<version>.tar.gz` | the HiveOS custom miner (see HiveOS below) |
| `cavaminer-<version>-windows-x86_64.zip` | Windows, the full package (`cavaminer.exe` and the same files) |
| `cavaminer-<version>-windows-x86_64.exe` | Windows, the bare program |

`SHA256SUMS` lists the checksums: `sha256sum -c SHA256SUMS` (Linux) or
`Get-FileHash` (PowerShell) checks a download. The full package unpacks
anywhere:

```sh
tar xzf cavaminer-*-linux-x86_64.tar.gz
cd cavaminer-*-linux-x86_64
```

On Windows, unpack the zip and open a terminal (Windows Terminal or
PowerShell) in that folder; the examples below read `.\cavaminer.exe`
for `./cavaminer`, and `sudo` means a terminal run as administrator.

The miner keeps everything it writes next to its settings file
(`cavaminer.toml` in the directory it is started from, or wherever
`--config` points): the settings, statistics, users, tuning results and
so on. Start it from a directory of its own.

## Quick start

```sh
./cavaminer devices                                   # the GPUs it sees, numbered as nvidia-smi does
sudo ./cavaminer                                      # first start: asks for pools and wallets, then mines
sudo ./cavaminer -o de.pearl.herominers.com:1200 -u <wallet>.<worker>              # PearlHash on all GPUs
sudo ./cavaminer --rx-url pool.supportxmr.com:3333 --rx-user <wallet>              # RandomX on the CPU
sudo ./cavaminer -o <host:port> -u <wallet> --rx-url <host:port> --rx-user <wallet>   # both
```

PearlHash mining runs when a PearlHash pool is set (and GPUs are not
`none`), RandomX mining when a RandomX pool is set. Started in a terminal,
the miner shows its menu (Tab opens it, `?` shows the help, `q` quits);
otherwise it writes log lines. The web interface is at
http://127.0.0.1:4078/ on the same machine (Settings → Web interface opens
it to the network). Ctrl-C, `q` in the menu or `cavaminer ctl stop` end it
(`cavaminer stop` ends a `--daemon`); clocks and power limits go back to
what they were.

## Running the miner

### First start

Started in a terminal without a settings file and without mining options
(`./cavaminer` or `sudo ./cavaminer`), the miner asks what to mine:

- PearlHash on the NVIDIA GPUs: a pool from a list of tested pools
  (HeroMiners, Kryptex, 2Miners, Suprnova, AlphaPool) or any address, TLS
  where the pool offers it, the Pearl wallet, a worker name, backup pools.
- RandomX on the CPU: your own p2pool node or a public pool (SupportXMR,
  HashVault, Nanopool, MoneroOcean, Kryptex, HeroMiners, C3Pool, or any
  address), the Monero wallet, a worker name, backup pools.

It shows the result, writes `cavaminer.toml` and starts mining; the menu,
the web interface and the command line change the settings later. Esc or
Ctrl-C at a question cancels without writing anything. Options that only
choose where the settings are or how the output looks (`--config`,
`--plain`, `--no-tui`, `--log`, `--log-file`, `--pid-file`) do not stop the
questions; any mining option does.

### Settings, options and the settings file

Everything the miner does is a setting with one name in all interfaces,
for example `electricity.max_price` or `randomx.threads` (the complete
list is in the reference at the end). Settings live in `cavaminer.toml`
and are changed by the menu, the web interface, the API, Home Assistant
and `cavaminer config set`; a running miner reads a changed file within
seconds, and settings marked "restart" apply after a restart (menu →
Restart, or `cavaminer ctl restart`).

Options on the command line override the file for that run: `-o` and
`--rx-url` replace the pool lists, `--set key=value` sets any setting (over
the file and the profile in effect; the value stays out of the file when
settings are saved during the run), and a `--power-max` given on the
command line is a hard ceiling the menu cannot raise. Options set on the
command line are marked "cmd line" in the menu and the web interface
(`--set` values are not).

### Output modes

| | |
|---|---|
| menu | In a terminal (also inside tmux or screen) the miner shows its interactive menu; see The menu below |
| log lines | Without a terminal (a service, HiveOS, a pipe) or with `--no-tui`: status lines every 30 s (`--status-interval`, at least 5) and the log, with colours only when the output is a terminal and `NO_COLOR` is not set |
| `--plain` | Plain text everywhere: log lines without colours or other control codes, no menu, simple line prompts at the first start |
| `--quiet` (`--silent`) | No output at all, in the foreground (only a fatal error at the start still goes to stderr); the log can still go to `--log-file` |
| `--daemon` | In the background; see below |

`--log` sets the log level (`info`, `debug`, `warn`, or filters such as
`cavaminer=debug`); `--log-file` also writes the log to a file (always
without colours).

### Background mode

`--daemon` (`-B`, `--background`) runs the miner in the background: it
detaches from the terminal, prints its process id and returns. The log
goes to `--log-file` (default `cavaminer.log` next to the settings file)
and the process id to `--pid-file` (default `cavaminer.pid`). The pools
must be set already (the first-start questions need a terminal).

```sh
sudo ./cavaminer --daemon      # CavaMiner runs in the background (pid 12345); log: cavaminer.log …
sudo ./cavaminer stop          # SIGTERM; waits until the GPUs are restored and the miner has exited
sudo kill -HUP 12345           # restart with the saved settings
```

A second miner with the same pid file is refused.

### As a systemd service

Under systemd, run the miner in the foreground with `--no-tui` (its log
lines go to the journal, and systemd restarts it) from a directory of its
own, so that its files stay together:

```ini
[Unit]
Description=CavaMiner
Wants=network-online.target
After=network-online.target

[Service]
Type=simple
WorkingDirectory=/var/lib/cavaminer
ExecStart=/opt/cavaminer/cavaminer --no-tui
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Set up the pools first (`cavaminer config set pools.pearl '[…]'` in that
directory, or run the miner there once in a terminal), or give them on the
command line. `cavaminer ctl status` and the web interface work as usual.

### HiveOS

The HiveOS package (`cavaminer-<version>.tar.gz`) is a custom miner:
in the flight sheet choose "Custom" as the miner, give the package's
download URL as the installation URL, and fill in:

| flight sheet field | becomes |
|---|---|
| Pool URL | `-o <url>` (several, comma-separated, for failover) |
| Wallet and worker template | `-u <template>`, e.g. `%WAL%.%WORKER_NAME%` (the worker name is the rig's name) |
| Pass | `-p <password>` (optional) |
| Extra config arguments | any further options, separated by `;`, e.g. `--mem-clock 5001;--power-limit 220` |

The miner then runs with log output and reports its hashrate (as kH/s of
the pool's unit), temperatures, fans and shares to the HiveOS agent through
`http://127.0.0.1:4078/summary`. Leave the clocks and power limits to
HiveOS' overclocking profiles there: the miner's own clock locks would be
reset when it exits. The package has not yet been tested on a HiveOS rig;
reports are welcome.

### Windows

`cavaminer.exe` is the same miner: the menu in Windows Terminal or
PowerShell, the web interface, the API, every setting and command. Run it
in a terminal opened as administrator for power limits, clocks, the clock
offset and large pages; without that it mines with the driver's settings.
What differs from Linux:

- **Not code-signed yet.** The Windows program carries no code signature
  in this release; a signed one will follow in a future release. Until
  then:
  - With **Smart App Control** on (Windows 11; Windows Security → App &
    browser control → Smart App Control), Windows refuses to start it:
    "An Application Control policy has blocked this file". There is no
    exception for a single program: either turn Smart App Control off
    (on many Windows 11 versions it cannot be turned on again without
    resetting Windows), or wait for the signed release.
  - Otherwise SmartScreen may warn when the downloaded program is first
    started ("Windows protected your PC": More info → Run anyway). To
    avoid it, unblock the zip before unpacking it (Properties → Unblock,
    or `Unblock-File` in PowerShell). Check the download against
    `SHA256SUMS` (`Get-FileHash` in PowerShell) either way.
- Background mode: `--daemon`, `cavaminer stop` and SIGHUP are Unix.
  To keep the miner running, make a scheduled task that starts it at
  boot as your account, elevated and without a stored password (in an
  administrator PowerShell; the task runs `cavaminer.exe --no-tui` in the
  miner's folder, and `cavaminer ctl stop` / `ctl restart` control it):

```powershell
$a = New-ScheduledTaskAction -Execute 'C:\cavaminer\cavaminer.exe' -Argument '--no-tui --log-file cavaminer.log' -WorkingDirectory 'C:\cavaminer'
$p = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType S4U -RunLevel Highest
$s = New-ScheduledTaskSettingsSet -ExecutionTimeLimit (New-TimeSpan -Days 3650) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName cavaminer -Action $a -Principal $p -Settings $s -Trigger (New-ScheduledTaskTrigger -AtStartup)
Start-ScheduledTask -TaskName cavaminer
```

- RandomX large pages (the 2 MiB pages of Linux) need the right "Lock
  pages in memory" for your account: `cavaminer hugepages --persist` as
  administrator grants it (Local Security Policy → User Rights
  Assignment), and it applies after logging in again. `cavaminer
  hugepages` shows whether the account has it. 1 GiB pages are Linux only.
- Not available on Windows: the MSR tweak (it needs a kernel driver), the
  maximum CPU clock and the CPU clock sweep (cpufreq), the CPU's package
  power (RAPL); Linux hashrates with the MSR tweak are 4–12 % higher.
- Auto-pause matches programs by their program name (not the command
  line); `cavaminer gpu-procs` shows the names as the miner sees them.
- An electricity price `command` runs through `cmd /C`.
- The HiveOS package is Linux only. Everything else, including the files
  next to the settings file and the Home Assistant integration, is the
  same.

## Pools

### Pool lists and failover

Each algorithm has an ordered list of pools, each with its own login. The
first enabled pool is used; after two failed connections in a row the
miner moves to the next one, and while it is on a backup pool it tries the
first one again every 5 minutes (every 30 minutes when that pool had
rejected it) and goes back as soon as it answers. In the settings file
(or the menu: Mining → PearlHash pools / RandomX pools, or the web
interface: Pools):

```toml
[[pools]]                        # PearlHash
url = "de.pearl.herominers.com:1200"
user = "<wallet>.<worker>"
[[pools]]
url = "backup.example:1200"
user = "<wallet>.<worker>"
enabled = false                  # kept in the list, not used

[[randomx.pools]]                # RandomX
url = "p2pool.lan:3333"
user = "rig1+450000"
```

`-o` / `--rx-url` on the command line replace the lists; `-u`, `-p`, `-w`
(`--rx-user`, `--rx-pass`) fill in the login of pools that have none.
Settings files with the older `[pool] url = [...]` form are converted when
loaded. A profile can have pool lists of its own.

### TLS

`stratum+ssl://host:port` (or `stratum+tls://`, `ssl://`, `tls://`)
connects with TLS. The certificate is checked against the built-in
Mozilla root store and the log says whether it verified, with its SHA-256
fingerprint. As in other miners, a certificate that does not verify
(self-signed, or issued for another host name) still gives an encrypted
connection; to accept only one certificate, pin it:

```toml
[[randomx.pools]]
url = "stratum+ssl://pool.supportxmr.com:443"
user = "<wallet>"
fingerprint = "58c7896fcaef14dbc0aa8a92fe5b297dabd9fa5912d21647ec854a499b3d6486"
```

### PearlHash pools

Tested on 2026-09-30 (shares accepted unless noted):

| pool | address (TLS) | login |
|---|---|---|
| HeroMiners | `de.pearl.herominers.com:1200` (TLS on the same port; certificate for `pearl.herominers.com`) | `wallet.worker` |
| Kryptex | `prl-eu.kryptex.network:7048` (TLS `:8048`; also `prl-us`, `-sg`, …) | `wallet/worker` |
| 2Miners | `prl.2miners.com:1818` (TLS `:11818`) | `wallet.worker` |
| Suprnova | `prl.suprnova.cc:3373` (TLS `:3374`) | `wallet.worker` |
| AlphaPool | `eu1.alphapool.tech:5571` (plain TCP; also `us1`, `us2`, `ru1`, `sg1`; `:5566` is their own miner's protocol) | `wallet.worker`; `wallet+nacr1….worker` merge-mines NACRE |
| K1Pool | `eu.pearl.k1pool.com:3360` | K1Pool account `Kr_….worker` |

The login is `wallet.worker` (or `wallet/worker`); `-w` / a pool's
`worker` field overrides the worker part. Shares are sent compressed
(`plain_proof_zst`, about 3 KB); 2Miners, Suprnova, K1Pool and Kryptex take
only uncompressed proofs (about 136 KB), so the miner switches to
`plain` for such a pool after its first rejection, or when a compressed
share gets no answer for 15 s (Kryptex ignores them), and sends the waiting
shares again. `pool.proof = "plain"` (`--proof plain`) makes that the
default.

A pool password other than the default `x` (`password` in a pool entry,
`-p`) goes to the pool with the login. AlphaPool reads options there:
`x;d=N` pins the share difficulty (their table: 131072 for an RTX 3070,
262144 for a 3090, 1048576 for a 5090; several GPUs on one rig share one
connection, so add them up; far lower values such as 4096 are refused at
login) and `;t=N` the payout threshold in PRL (for the whole wallet).
Without `d=` their vardiff starts at about a twentieth of a 5090's
difficulty and takes minutes to settle. Merge mining NACRE needs nothing
from the miner but the `+nacr1…` address after the wallet. Tested again on
2026-10-22 (static difficulty and merge mining, Linux and Windows):

```toml
[[pools]]
url = "eu1.alphapool.tech:5571"
user = "<wallet>+<nacr address>.<worker>"
password = "x;d=1048576"
```

Not supported: PearlFortune (its own protocol with client certificates),
pearlhash.xyz (closes the connection on any stratum message), PullSignal
(logs in but sent no jobs in our tests).

### RandomX pools

RandomX works with the xmrig/p2pool dialect (`login`/`job`/`submit`,
`keepalived`) that Monero pools use: p2pool (plain `host:3333`, also the
mini and nano sidechains), SupportXMR (`pool.supportxmr.com:3333`, TLS
`:443`), HashVault, Nanopool, MoneroOcean, Kryptex, HeroMiners, C3Pool and
the others speaking the same protocol. The login is the wallet address
(for p2pool any name; `name+N` fixes the share difficulty at N) and the
password usually the worker name. The login asks for `rx/0` and `rx/2`
only, so algorithm-switching pools such as MoneroOcean send RandomX jobs.

### RandomX v2

Monero's next hard fork (FCMP++) changes its proof of work to RandomX v2
(`rx/2`): longer programs, AES in the main loop, and shares judged by a
commitment (a Blake2b hash of the block blob and its RandomX hash). The
date is not set yet. CavaMiner mines both versions and follows each job's
`algo`: when your pool switches to `rx/2` at the fork, the miner switches
with it, without an update and without rebuilding the dataset (both
versions use the same one); the log says "the pool asks for RandomX v2",
and the menu and the web dashboard show "RandomX v2". Shares are submitted
the way xmrig 6.26 does. Your pool must support the fork as well and
name `rx/2` in its jobs (as xmrig expects too: a job without `algo` is
mined as `rx/0`); if you run your own P2Pool, it needs P2Pool v5 by then,
and P2Pool v5 pays main addresses only (no subaddresses). `cavaminer rx-bench --v2`
measures your CPU on v2 now (compare with xmrig 6.26 or newer, `-a rx/2`).

## GPUs (PearlHash)

### GPU numbers and saved settings

A GPU's number (GPU0, GPU1, …) is its place on the PCI bus, the order of
`nvidia-smi` and of `cavaminer devices`, and the same everywhere: `-d`,
the menu, the web interface, the API, the logs, `/summary` and Prometheus.
A card added in a slot before the others shifts the numbers, but the
saved settings belong to the cards: each GPU's power limit, clocks and
offset are saved with its UUID (which stays with the card) and its slot
(PCI address), and checked at every start:

- the same card in the same slot keeps its settings;
- a card moved to another slot takes them along (`miner.follow_gpus`,
  default on; off, the settings stay with the slot);
- a new card of the same model in a slot gets that slot's settings;
- a card of another model never gets the settings of the card that was in
  its slot before;
- settings of cards no longer in the machine stay in the file, for when
  they come back.

What changed is logged and saved (also in the profiles); `cavaminer
devices` shows each GPU's number, PCI address and UUID, the settings it
gets and what the next start would change.

### Power limit, ceiling and clocks

Each GPU has (per profile):

| setting | |
|---|---|
| power limit | set before mining starts (`--power-limit`); on exit the lower of the original and the requested limit stays, so it is never raised behind your back |
| ceiling (`power_max`) | a hard limit nothing (sweeps, tuning, the menu) ever goes above; default the power limit given, else the limit the GPU had at start |
| memory clock | locked while mining (`--mem-clock`); PearlHash needs little memory bandwidth, so a low memory clock gives the cores more of the power budget (see Tuning) |
| GPU clock | locked while mining (`--gpu-clock`); power and thermal limits still apply |
| clock offset | the voltage/frequency curve's offset (`--gpu-offset`, undervolting; see Tuning) |
| clock cap (`gpu_clock_max`) | the highest GPU clock; unlike a lock the clock can still drop. Saved with an offset, so a light load cannot boost the GPU to clocks the offset was never tested at |

On the command line each takes one value for all GPUs or a comma-separated
list, one per GPU in `-d` order; the menu (Mining → GPUs), the web
interface (Settings) and the API apply them at once. The menu and the web
interface offer the clocks the driver supports and the power range it
allows. All of them need root and are reset when the miner exits.

### Hashrate

PearlHash hashrate is reported in the pool's unit, int8
multiply-accumulates per second (TH/s = 10¹² MAC/s); RandomX in hashes per
second. Efficiency is hashes per joule, shown as GH/W (PearlHash) or H/W
(RandomX).

## RandomX on the CPU

### Threads and CPUs

The RandomX dataset needs 2 MiB of cache per hashing thread to run at full
speed, so by default the miner takes the number of threads from the
caches: per L3 cache one thread per 2 MiB of L3, plus one per L2 cache of
2 MiB or more where the L3 does not hold copies of the L2s (recent
Intel), at least one per core where a core's L2 and its share of the L3
hold 2 MiB (Xeon Scalable), and at most one per logical CPU. The threads
are spread over the L3 caches by what they hold, one per core first, then
the SMT siblings, and pinned to their CPUs at the lowest priority (`nice`
19), so the GPU feeding and the rest of the system go first.

Other choices: a number of threads in all (`randomx.threads`), a number on
every socket (`randomx.threads_per_socket`), or the CPUs themselves
(`randomx.affinity`, e.g. `0-15,64-79`; with it, `auto` threads means one
per listed CPU). In the menu (Mining → RandomX settings, Enter on Threads,
Threads per socket or CPUs) and in the web interface (Settings → RandomX,
"Choose CPUs…") a picture of the CPU shows every socket, its L3 caches
(with the threads each holds) and the cores with their logical CPUs: choose
automatic, a number in all or per socket (the picture shows which CPUs the
miner picks), or switch CPUs, cores, L3 caches and sockets on and off
yourself; the CPU list follows. `GET /api/v1/cpu` and `GET /api/v1/cpu/plan`
give the same to scripts.

On machines with several NUMA nodes (servers with two or more sockets)
each node with hashing threads gets its own dataset in its own memory,
and the threads read their node's: twice the memory and huge pages (or
three 1 GiB pages per node), but no reads across sockets.

### Huge pages

The dataset (2080 MiB), the cache (256 MiB) and each thread's scratchpad
(2 MiB) want 2 MiB huge pages: 1040 + 128 + one per thread. Started as
root, the miner reserves the missing ones itself (memory is compacted
first if the kernel finds too few) and leaves them reserved for the next
start, as xmrig does; without root it says which command reserves them.
`cavaminer hugepages` shows what is needed and reserves it (as root);
`sudo cavaminer hugepages --persist` also writes
`/etc/sysctl.d/60-cavaminer-hugepages.conf`, so they are reserved at boot,
before memory fragments. Without reserved huge pages the dataset asks for
transparent huge pages (THP `always` or `madvise`), which recovers part of
the loss. With `randomx.pages_1gb` (`--rx-1gb-pages`) the dataset goes on
three 1 GiB pages (reserved at start as root; at boot: `hugepagesz=1G
hugepages=3` on the kernel command line).

### MSR tweak

As root on AMD Zen 2 to Zen 5 (Zen 4: the Ryzen 7000 desktop and 7040 /
8040 mobile parts; other Zen 4 models are left alone) and on Intel CPUs
the miner sets the few prefetch-related CPU registers that xmrig's "MSR
mod" sets (+11 % on a Zen 2 Threadripper, +4 % on Zen 3 to 5, +8–12 % on
Intel) and restores them on exit. `randomx.msr = false` (`--rx-msr false`) leaves them alone.

### Maximum CPU clock

RandomX loses less hashrate than power at lower clocks, so a clock cap
often pays: a Ryzen 9 9950X keeps 91 % of its hashrate at 4000 MHz with
60 % more hashes per joule, a 7950X 95 % at 4500 MHz (+47 %), a
Threadripper PRO 3995WX 91 % at 2600 MHz (+23 %); a CPU already held back
by a power limit (such as an Intel at 65 W) gains nothing.
`randomx.max_freq` (`--rx-max-freq`; Settings → RandomX → Maximum CPU
clock) sets cpufreq's maximum on every CPU while RandomX mines (Linux, as
root) — all of them, also the ones without a hashing thread: the cores
share their supply voltage, so one uncapped core that boosts for other
work raises the voltage and power of the capped ones (a 3995WX mining on
64 of its 126 threads at 2000 MHz: 286 W with only the mining cores
capped, 187 W with all). With acpi-cpufreq (older Ryzen without
amd-pstate) there are only the P-states, and the boost clocks above them
ignore the limit, so a cap also turns boost off (per core where the
kernel allows, else for all CPUs): a Ryzen 9 5950X then runs at its
3400 MHz base clock, 92 % of the hashrate with 21 % more hashes per
joule. The original limits come back when mining stops, while it is
paused and after a crash. With profiles and a schedule the cap can depend
on the time of day or the electricity price; the setting applies at
once. Tuning → CPU clock sweep measures your CPU (see Tuning);
`cavaminer --rx-max-freq 4000 rx-bench` tests one value offline.

## Tuning

PearlHash is compute-bound: under a power limit, every watt the memory
does not use goes to the GPU cores. Locking the memory clock low raises
the hashrate at the same power — on an RTX 3090 at 250 W, 5001 MHz instead
of 9501 MHz gives about +20 % — and the GPU clock lock, the power limit
and the clock offset each move the balance between hashrate and watts.
The miner measures all of them for you, while it keeps mining.

### Auto-tune (safe range)

`--autotune` finds the most efficient setting (hashes per watt) on its
own, while mining (about 10 minutes; needs root):

```sh
sudo ./cavaminer --autotune --power-limit 450 -o ... -u ...
```

It measures the driver's default memory clock and every supported memory
clock from 30 to 90 % of the highest at the natural GPU clock, then GPU
clock locks stepping down from the natural clock until the efficiency
falls twice in a row, then the other memory clocks at the best lock, and
measures the two best settings again. The most efficient setting wins
(settings within 1 % count as equal; the faster one is chosen) and is
kept. It stays in the safe range: only clocks the driver lists as
supported (stock voltage curve, no offsets), the power limit is never
raised, and it stops if a GPU comes within 5 °C of its slowdown
temperature. `--tune-min-hashrate 90` never picks a setting below 90 % of
the best measured hashrate; `--tune-window` is the seconds per setting
(default 20).

The menu (Tuning → Auto-tune) and the web interface (Tuning) run it while
the miner keeps going, and also a **scan**: an auto-tune at each of
several power limits, from the GPU's ceiling (never above it) down to 60 %
of it in five levels, unless you choose the range and step (about 8
minutes per power limit). The best setting of all is applied with its
power limit and saved in the running profile. Every run is kept (the
latest 20 per GPU in `cavaminer-tune.json`) with all the settings it
measured: the results show while a run goes and afterwards (the run whose
setting is applied, or an older one), as a table and as bars of power,
hashrate and efficiency, sorted as you like, and any measured setting can
be applied (power limit, memory clock and GPU lock, saved). In the menu: ↓
past "Start" into the results, `[` `]` older and newer runs, `o` sort, `g`
bars, Enter applies the selected setting, `c` cancels a running tune.

### Power sweeps

A sweep measures hashrate and efficiency at every power limit from the
GPU's lowest to its highest (at most the ceiling) in 5 W steps, 16 s per
point plus half as long to settle, while mining; afterwards the limit
returns to its setting. `--sweep` (with `--sweep-min`, `--sweep-max`,
`--sweep-step`, `--sweep-window`) runs one without the menu; the menu
(Tuning → Power sweep, results under Sweep results with a table and
graphs; Enter sets a power limit, `k` jumps to the knee) and the web
interface (Tuning, with a chart and "Set limit") run it while mining. The
latest sweep per GPU is kept in `cavaminer-sweeps.json`, so the curves can
be viewed later without sweeping again. The suggested *knee*: going up in
power, the last limit where the extra watts still earn at least 35 % of
the average efficiency.

### Clock offset (undervolting)

Outside the safe range: a positive offset of the voltage/frequency curve
runs each clock at a lower voltage, so within a power limit the GPU clocks
higher (two RTX 5090s at 500 W: +9 %; an RTX 3070 at 195 W: +6 %). Too
much offset makes the GPU compute wrong results, and at clocks it was
never tested at it can hang (a reboot is then needed). `--autotune-offset`
finds the offset per GPU while mining (about 15 minutes; needs root):

```sh
sudo ./cavaminer --autotune-offset
```

With the GPU at its power limit it raises the offset in 50 MHz steps
(`--offset-step`, up to `--offset-max`, default 1000) with frequent
self-checks: every eighth attempt is computed twice and all its tile
hashes compared, so a computing error shows as a mismatch. The first
offset with a mismatch ends the search; the highest good one less
`--offset-margin` (50 MHz) is confirmed for two minutes and saved in the
settings with a clock cap 2 % above the clock it ran at (`gpu_offset`,
`gpu_clock_max`), so that a light load cannot boost the GPU to untested
clocks. Offsets being tried are written to `cavaminer-offset-trial.json`
first: after a hang, the next search stays below that offset; the results
go to `cavaminer-offsets.json`.

While mining with an offset, one attempt in 1024 is checked
(`--self-check`); a failed check lowers the offset by one step and saves
it (in the running profile when that profile sets the offset, else in the
base settings). The miner also re-applies the clock cap or lock within a second
whenever the clock runs above it (for example after an `nvidia-smi -rgc`
from outside) and removes the offset if it cannot. Auto-pause gives other
programs the driver's clocks (no offset, no locks) and restores the tuning
on resume. Run the offset search where the machine can be restarted.

### CPU clock sweep (RandomX)

In the menu (Tuning → CPU clock sweep) or the web interface (Tuning) the
miner measures the RandomX hashrate, the CPU package power and the clock
while it keeps mining: first with no cap, then with the maximum CPU clock
stepped down from just below that clock (250 MHz steps by default, down to
60 % of it, at least 2000 MHz; acpi-cpufreq: its P-states, each with boost
off), about 35 s per point. All CPUs are capped (they share their voltage,
see RandomX above); afterwards the cap returns to its setting. The result
is kept (`cavaminer.cpusweep.json`) with three suggestions: the highest
hashrate, the best compromise (the most hashes per joule with at least
90 % of the highest hashrate) and the best efficiency; "Use" (Enter in the
menu) makes a point's clock the maximum CPU clock of the running profile,
which applies at once. Where GPUs mine too, look at their hashrate after a
low cap: feeding them runs on the same CPU. Needs root and the CPU package
power (RAPL). API: `GET/POST/DELETE /api/v1/cpu/sweep`.

### What is reset when the miner stops

The miner resets the clock locks and offsets when it exits (Ctrl-C,
SIGTERM, SIGHUP, a crash); the power limit ends at the lower of its
original and requested value, so it is never raised behind your back; the
CPU clock cap and the MSR registers go back to their values. After a hard
crash, `sudo nvidia-smi -rmc` and `sudo nvidia-smi -rgc` reset the locks;
a clock offset left behind is reset when the next run that sets one
(`gpu_offset`, or `--gpu-offset 0`) exits.
Power limits are lost when the driver unloads an idle GPU unless
persistence mode is on (`sudo nvidia-smi -pm 1`). If an overclocking tool
already manages clocks (HiveOS OC profiles, for example), use that
instead: the miner's reset on exit would undo it.

## Profiles and schedule

A profile is a named set of settings over the base ones; it stores only
what differs: which GPUs mine (`none` turns GPU mining off), power limits
and clocks per GPU, the RandomX threads, CPUs, priority and clock cap,
`randomx.enabled = false`, pools, anything the settings screen lists. In
the settings file:

```toml
[profiles.night.randomx]
threads = 32
[[profiles.night.gpu]]
uuid = "GPU-…"
power_limit = 500.0

[profiles.day.miner]
devices = "none"          # no GPU mining during the day
[profiles.day.randomx]
max_freq = 4000           # and a CPU clock cap

[[schedule]]
cron = "0 22 * * *"       # minute hour day month weekday (local time)
profile = "night"
[[schedule]]
cron = "0 7 * * mon-fri"
profile = "day"
```

Time specs are cron's (`*`, `*/n`, ranges, lists, month and weekday
names, `@daily` …). The profile of the entry that fired last runs, so the
right one also applies after a restart; a profile chosen in the menu, the
web interface or the API holds until the next scheduled change;
`--profile` overrides both. On a change the miner restarts itself with the
new settings (a few seconds, plus the RandomX dataset). The electricity
price can also switch to a profile (below). Menu: Automation → Profiles &
schedule; web interface: Automation; command line: `cavaminer config set
… --profile night`.

## Auto-pause

Mining pauses while other programs use a GPU, and resumes once they have
been idle for a while:

```toml
[[autopause]]
processes = ["ollama", "vllm", "llama-server"]   # parts of names or command lines; ["*"] = any other program
threshold = 10        # GPU (SM) use in % that counts as activity (default 10)
combine = "sum"       # "sum" (default): the matching programs' use added up; "max": the busiest one alone
pause_after = 30      # seconds the use must stay at the threshold before mining pauses (default 0 = at once)
resume_after = 600    # seconds without activity before mining resumes (default 300)
interval = 5          # seconds between checks (default 5)
gpus = "same"         # "same" (default): the GPU the program uses; "all": every GPU
cpu = false           # also pause RandomX (default false)
power_limit = 575.0   # optional: power limit while paused, the mining one returns on resume
```

A paused GPU frees its memory for the other program and gets the driver's
default clocks. The per-program use comes from NVML (as `nvidia-smi pmon`;
each program's highest use since the previous check); `cavaminer gpu-procs
[seconds]` lists the programs using each GPU and how much, for writing
triggers. Triggers are edited in the menu (Automation → Auto-pause, one
line of `key=value` pairs), the web interface (Automation) and the API, and
apply at once.

A pause for the price, by auto-pause and by you (`P` in the menu, "Pause"
in the web interface, `cavaminer ctl pause`) each hold on their own: the
miner resumes only when none of them pauses it. Your own pause is kept
across restarts until you resume.

## Electricity price

Mining can follow the electricity price: it runs while the price is low
enough and pauses (or runs another profile) while it is high. Prices come
from a provider (day-ahead spot markets and dynamic tariffs in about 40
countries, below), from a URL or from a command of your own. The price
compared is what you pay per kWh:

    (spot × factor + markup + time-of-day tariffs [+ Danish grid tariffs]) × (1 + VAT/100)

Mining runs while that is at most `max_price` and/or during the
`cheapest_hours` cheapest hours of each day (in the market's time zone);
otherwise `action` applies: `pause` (all mining, the default),
`pause-gpus`, `pause-cpu`, or `profile:<name>` (the miner restarts into
that profile while the price is high, a few seconds plus the RandomX
dataset; pausing is instant and frees the GPUs' memory).

```toml
[electricity]
provider = "energidataservice"   # cavaminer prices --list shows all
area = "DK2"
grid = "radius"                  # Denmark: + grid tariff, Energinet's tariffs and the electricity tax
markup = 0.0                     # supplier markup per kWh
vat = 25.0
max_price = 1.50                 # DKK/kWh incl. all of the above
cheapest_hours = 4               # and the 4 cheapest hours of each day anyway
action = "pause"
```

With `grid` (31 Danish grid companies: `radius`, `cerius`, `n1`,
`konstant`, `trefor`, `trefor-oest`, `dinel`, `rah`, `elnet-midt`, `noe`, …)
the price is what a Danish household pays: the grid company's hourly C
tariff plus Energinet's transmission and system tariffs and the
electricity tax, from Energi Data Service, refreshed twice a day. Other
examples:

```toml
[electricity]                    # Sweden, Nord Pool, 15-min prices in SEK
provider = "nordpool"
area = "SE3"
currency = "SEK"
markup = 0.80                    # energy tax, grid fee, markup per kWh
vat = 25.0
max_price = 1.20

[electricity]                    # any European bidding zone, with a free ENTSO-E token
provider = "entsoe"
area = "DE-LU"
token = "…"
tariffs = [{ when = "* 17-20 * * *", price = 0.08 }]   # cron time of the interval start; each match is added

[electricity]                    # Great Britain, Octopus Agile (price incl. VAT)
provider = "octopus-agile"
area = "C"                       # region letter
max_price = 0.15
```

`max_price` alone mines whenever the price is at most the limit;
`cheapest_hours` alone mines the cheapest N hours of every day; with both,
either is enough. `missing = "pause"` treats an unknown price as too
expensive (the `action` applies) while no price is known for now
(default: mine). `timezone` overrides the market's time zone for the
tariff times and the days of `cheapest_hours`. `enabled = false` keeps the
settings without using them.

**Your own source**: `provider = "url"` with `url = "https://…"`, or
`provider = "command"` with `command = "…"` (run with `sh -c`, 60 s limit).
The answer is either a number (the price now, polled every `interval`
minutes, default 5), `{"price": 1.23}`, or a list of intervals:

```json
[{"start": "2026-10-11T12:00:00Z", "end": "2026-10-11T13:00:00Z", "price": 0.42},
 {"start": 1791723600, "price": 0.39}]
```

(also as `{"prices": [...]}`; times in RFC 3339 or Unix seconds; `end`
defaults to the next start, or to the list's step when the next start is
further away.) The same additions and VAT apply.

Day-ahead prices are fetched every 10 minutes from 12:45 market time until
tomorrow's are in, otherwise every 6 hours; real-time sources every 5
minutes; after a failure the miner tries again after 1, 2, 5, 10, 20 and
then every 30 minutes. Prices are cached in `cavaminer.prices.json`, so a
restart decides at once and a short outage of the source does not matter.
The menu (Automation → Electricity price, shortcut `e`) and the web
interface (Electricity) show the price now, the decision and until when
it holds, a chart of today and tomorrow (green = mining) and all the
settings (applied at once); `cavaminer prices` prints the coming intervals
with the settings applied, `cavaminer prices --list` the providers and
the Danish grid companies.

| provider | source | region | currency | token | price |
|---|---|---|---|---|---|
| `energidataservice` | Energi Data Service (Energinet) | Denmark (also DE, NO2, SE3, SE4) | DKK/EUR |  | day-ahead spot, 15 min, excl. VAT; with `grid = <company>` the Danish tariffs and taxes are added |
| `stromligning` | Strømligning | Denmark, all-in price per grid area | DKK |  | spot + grid tariff + Energinet + electricity tax, excl. VAT (set vat = 25), 15 min; non-commercial use only, 15 requests/15 min |
| `energy-charts` | Energy-Charts (Fraunhofer ISE) | Europe: 40 bidding zones | EUR |  | day-ahead spot, 15 min (CH hourly), excl. VAT; some zones private use only |
| `nordpool` | Nord Pool | Nordics, Baltics, DE-LU, AT, BE, FR, NL, PL, BG, RO, UK | EUR/DKK/NOK/SEK/PLN/GBP |  | day-ahead spot, 15 min (UK hourly, GBP), excl. VAT |
| `entsoe` | ENTSO-E Transparency Platform | Europe: all bidding zones | EUR | yes | day-ahead spot, excl. VAT; free token: register at transparency.entsoe.eu and ask for REST API access |
| `elering` | Elering | Estonia, Latvia, Lithuania, Finland | EUR |  | Nord Pool day-ahead, 15 min, excl. VAT |
| `spot-hinta` | spot-hinta.fi | Finland, Baltics, Norway, Sweden, Denmark | EUR |  | day-ahead spot, 15 min, excl. VAT; one request per minute |
| `elprisetjustnu` | Elpriset just nu | Sweden | SEK/EUR |  | day-ahead spot, 15 min, excl. VAT and taxes |
| `hvakosterstrommen` | Hva koster strømmen | Norway | NOK/EUR |  | day-ahead spot, hourly averages, excl. VAT and grid tariff |
| `porssisahko` | Pörssisähkö.net | Finland | EUR |  | day-ahead spot incl. 25.5 % VAT, 15 min |
| `awattar` | aWATTar | Germany, Austria | EUR |  | EPEX day-ahead spot, hourly, excl. VAT |
| `tibber` | Tibber | Germany, Netherlands, Norway, Sweden (Tibber customers) | EUR/NOK/SEK | yes | your Tibber price incl. VAT and taxes, 15 min; token from developer.tibber.com; area = home number (1, 2, …) |
| `smartenergy` | smartENERGY | Austria | EUR |  | EPEX AT spot incl. 20 % VAT, hourly values in 15-min slots |
| `energyzero` | EnergyZero | Netherlands | EUR |  | NL: spot excl. VAT; NL-all-in: incl. energy tax, purchasing cost and 21 % VAT; 15 min |
| `easyenergy` | easyEnergy | Netherlands | EUR |  | NL: spot excl. VAT; NL-all-in: incl. energy tax, purchasing cost and VAT; 15 min |
| `frank-energie` | Frank Energie | Netherlands, Belgium | EUR |  | NL/BE: spot excl. VAT; NL-all-in: incl. markup, energy tax and VAT; 15 min |
| `groupe-e` | Groupe E Vario | Switzerland (Groupe E grid) | CHF |  | dynamic tariff excl. VAT (vario: energy + grid; vario-grid: grid only), 15 min |
| `ekz` | EKZ Energie Dynamisch | Switzerland (EKZ grid) | CHF |  | dynamic tariff excl. VAT (integrated: energy + grid 400D + fees; energy: energy only), 15 min |
| `pse` | PSE | Poland | PLN |  | SDAC day-ahead (CSDAC), 15 min, excl. VAT |
| `ote` | OTE | Czechia | EUR |  | day-ahead spot, 15 min, excl. VAT |
| `okte` | OKTE | Slovakia | EUR |  | day-ahead spot, 15 min, excl. VAT |
| `ree` | Red Eléctrica (REData) | Spain | EUR |  | ES: day-ahead spot, 15 min; ES-PVPC: regulated PVPC 2.0TD (incl. tolls and charges, excl. VAT and tax), hourly |
| `octopus-agile` | Octopus Energy Agile | Great Britain (regions A–P) | GBP |  | Agile unit rate incl. VAT, 30 min; area = region letter (C = London, A = East England, …) |
| `comed` | ComEd Hourly Pricing | USA: Illinois (ComEd) | USD |  | PJM real-time price for the ComEd zone, 5 min, supply part only; real time (no prices ahead) |
| `nyiso` | NYISO | USA: New York (11 zones) | USD |  | day-ahead zonal LBMP, hourly, wholesale |
| `miso` | MISO | USA: Midwest and South (hubs, or any MISO node) | USD |  | day-ahead LMP (ex-post), hourly, wholesale |
| `caiso` | CAISO OASIS | USA: California (hubs, DLAPs, or any CAISO node) | USD |  | day-ahead LMP, hourly, wholesale |
| `pjm` | PJM Data Miner 2 | USA: PJM (13 states + DC); area = pnode id | USD | yes | day-ahead LMP, hourly; free key from apiportal.pjm.com; area = pnode id (51288 Western Hub, 33092371 ComEd zone) |
| `gridstatus` | GridStatus.io | USA (ERCOT, PJM, CAISO, SPP, MISO, NYISO, ISO-NE) and Canada; area = `<dataset>/<location>` | USD | yes | any GridStatus price dataset (e.g. ercot_spp_day_ahead_hourly/HB_NORTH); key from gridstatus.io |
| `ieso` | IESO | Canada: Ontario | CAD |  | day-ahead Ontario zonal price, hourly, wholesale |
| `aeso` | AESO | Canada: Alberta | CAD |  | pool price, hourly, wholesale; real time (no prices ahead) |
| `aemo` | AEMO NEM | Australia: NSW, QLD, VIC, SA, TAS | AUD |  | wholesale regional price, 5 min actual + 30 min pre-dispatch forecast, excl. GST |
| `amber` | Amber Electric | Australia (Amber customers) | AUD | yes | your Amber price incl. GST (general channel); token from app.amber.com.au/developers; area = site id (default: the first site) |
| `em6` | em6 | New Zealand (6 reference nodes) | NZD |  | wholesale nodal price, 30 min, last 24 h (real time, no prices ahead) |
| `jepx` | JEPX | Japan (system price and 9 areas) | JPY |  | day-ahead spot, 30 min, wholesale |
| `iex` | IEX India | India | INR |  | day-ahead market clearing price, 15 min, wholesale |
| `cenace` | CENACE | Mexico (SIN nodes) | MXN |  | day-ahead nodal price (PML), hourly; area = node code |
| `oree` | OREE | Ukraine (IPS) | UAH |  | day-ahead market price, hourly, wholesale |

Prices marked spot or wholesale exclude VAT, grid fees and taxes: add them
with `markup`, `tariffs` and `vat` if `max_price` is meant as the price you
pay. Some sources ask for attribution when their prices are shown publicly
or are for non-commercial use (Strømligning, some Energy-Charts zones, Nord
Pool's terms); for scheduling your own miner that is fine.

## The menu

In a terminal (also inside tmux or screen) the miner shows an interactive
menu. It is a tree beside the screens: Tab (or Esc from a screen) moves
the keys to it, ↑↓ choose, Enter opens, Esc or Tab goes back to the
screen; on terminals under 100 columns it takes the whole width while it
has the keys. The line above the keys shows where you are (for example
"Mining › PearlHash pools") and messages; the bottom line shows the keys
of the screen.

| menu | |
|---|---|
| Dashboard | per-GPU hashrate, shares, power / limit / ceiling, efficiency, clocks, temperature, fan, locks and state; the CPU (with its power as root); a hashrate graph per algorithm; the log |
| Mining | GPUs (power limit, ceiling, clock locks: applied at once and saved; Enter lists the clocks the driver takes), PearlHash pools and RandomX pools (ordered lists with failover), PearlHash settings, RandomX settings, Kernel (advanced) |
| Tuning | Auto-tune (and scans, with the kept runs and their results), Power sweep, Sweep results (table and graphs; Enter sets a power limit), CPU clock sweep (Enter uses a clock) |
| Automation | Profiles & schedule, Electricity price (chart and settings), Auto-pause triggers |
| System | Web interface & API, Statistics, Output & logging (log level, status lines), Log (scrollable), Help |
| Restart, Quit | restart with the saved settings; quit (restores clocks and power limits) |

Every settings screen comes from the same list of settings the web
interface, the API and `cavaminer config` use: Enter edits — on a setting
with a list of values (price source, area, grid company, clocks, …) it
opens the list with what each value means: type to filter, ↑↓ and Enter
choose, "other value…" where the list may be incomplete — ←→ steps through
the list, Del (or Backspace) goes back to the default, `[` `]` switch between the base
settings and the profiles (a profile stores only what differs, and a
profile that is not running takes its settings when it runs). Settings
marked "restart" apply after Restart.

| screen | keys |
|---|---|
| everywhere | Tab menu, `P` pause / resume all mining (kept until resumed), `?` or F1 help, `q` quit, Ctrl-L redraw; shortcuts `d` dashboard, `s` GPU settings, `p` profiles, `a` auto-pause, `w` sweep, `v` sweep results, `u` auto-tune, `e` electricity, `l` log |
| GPUs | ↑↓ select, ←→ or `[` `]` profile, Enter edit (clocks: the list of values the driver takes) |
| settings groups | ↑↓ select, Enter edit or list, ←→ next value, Del or Backspace default, `[` `]` profile |
| pools | ↑↓←→ cell, Enter edit, `+` add, Space on/off, Shift+↑↓ (or `K`/`J`) move, `x` delete |
| profiles & schedule | ↑↓ select, Enter run the profile now, `e` edit its settings, `n` new profile, `+` schedule entry, `x` delete |
| auto-pause | ↑↓ select, `+` add, `e` edit, `t` on/off, `x` delete |
| auto-tune | ↑↓ field, ←→ choose, Enter edit or start, ↓ past Start into the results (`[` `]` older/newer run, `o` sort, `g` bars, Enter apply), `c` cancel |
| power sweep | ↑↓ field, ←→ GPU, Enter edit or start, `c` cancel |
| sweep results | ←→ GPU, ↑↓ or a row number row, Enter set that power limit, `k` knee |
| CPU clock sweep | ↑↓ field or row, Enter edit, start or use that clock, `c` cancel |
| log | ↑↓ PgUp PgDn scroll, End follow |
| RandomX CPUs (picture) | arrows move, Space core, `l` L3 cache, `s` socket (custom / optimal / all / off), `a` automatic, `n` threads in all, `p` per socket, `t` type the list, `c` none, Enter save, Esc cancel |

Text fields edit like a shell line (←→, Home/End, Ctrl-←→ by word,
Ctrl-U/K/W; Enter keeps, Esc drops the change). `NO_COLOR` makes the menu
monochrome.

## The web interface

The miner serves a web interface, the REST API, `/summary` (HiveOS) and
`/metrics` (Prometheus) on the `miner.api` address (`--api`; default
`127.0.0.1:4078`, this machine only; `0.0.0.0:4078` for the network; `0`
turns it off). `web.tls = true` serves HTTPS with a self-signed certificate
made once (`cavaminer.web.crt` / `.key` next to the settings), or with
`web.cert` / `web.key` of your own. Dark and light themes; works on a
phone.

| page | |
|---|---|
| Dashboards | your own: tabs, each a grid of widgets — a value with a sparkline, charts of any metrics over 1 hour to 1 year (with event markers), the GPU table, the CPU (hashrate, power, efficiency), the electricity price, controls (pause, resume, profile, restart), events, the log. "Edit dashboard" adds, moves, resizes and removes widgets and dashboards |
| Miners | controls, PearlHash and RandomX state, the GPU and CPU tables with their tuning, the electricity decision, version and uptime |
| Statistics | any metrics over any range as a chart, the events in it, CSV export |
| Electricity | the price now, the decision, the chart of today and tomorrow, the provider's notes and all the price settings |
| Settings | every setting, per profile, with its help; GPU settings applied at once (clocks from the driver's list, power limits with their range); "Choose CPUs…" for RandomX |
| Pools | the pool lists of each algorithm and profile: order, on/off, logins, TLS fingerprints |
| Automation | profiles (run, delete, create), the schedule (with the next time of each entry), the auto-pause triggers |
| Tuning | auto-tune and scans with every run kept, bars and tables of the results, any measured setting applied; power sweeps with charts and "Set limit"; the CPU clock sweep with its chart and "Use" |
| Log | the log, filtered, following |
| Account | your login, password and two-factor setup; users and API tokens (admin) |
| Documentation | this document |
| API | every endpoint described, each can be tried |

### Access from other machines

Until a user exists, only this machine (the loopback address) can use the
web interface and the API, without a login, and only under its own
address in the browser (`127.0.0.1`, `localhost` or the machine's name;
so a web site you visit cannot reach the miner by pointing its own name
at your machine); API tokens work from anywhere. Create a user to use it
from elsewhere, with two-factor login if you like:

```sh
sudo ./cavaminer user add cavauser --totp    # asks for the password, shows a QR code for the authenticator app
sudo ./cavaminer token add home-assistant    # an API token for scripts and Home Assistant (shown once)
./cavaminer config set miner.api 0.0.0.0:4078
./cavaminer config set web.tls true          # HTTPS (a self-signed certificate is made; or web.cert / web.key)
```

Users are `admin` (everything) or `viewer` (read only, no secrets).
Passwords are stored as PBKDF2 hashes, tokens as SHA-256 hashes, both in
`cavaminer.auth.json` (readable by its owner only); logins last
`web.session_hours` (a week) and survive restarts; five failed logins
block the client for 15 minutes. Users and tokens can also be managed in
the web interface (Account) and the API.

Users and tokens work from anywhere by default. Each can be limited to
this machine (`--local-only` on `user add` / `token add`, later `cavaminer
user access <name> local|any`, `cavaminer token access <name> local|any`,
or the Account page), and `web.remote_users` / `web.remote_tokens` set to
false limit all users / all tokens to it. The rules are checked on every
request, so a change also ends open sessions from elsewhere. "This
machine" is the loopback address (127.0.0.1, ::1): behind a reverse proxy
on the same machine every request looks local, so leave these to the
proxy there. `/summary` is for this machine only unless
`web.public_summary` is on.

## REST API

`/api/v1`, JSON; `Authorization: Bearer <token>` (or the web session;
requests from a browser session that change something need the header
`X-CavaMiner: 1`). The API page of the web interface describes every
endpoint (parameters, bodies, responses, examples) and can try each; the
same description as OpenAPI 3 is at `/openapi.json` (for Swagger, Postman
or code generators). In short:

| | |
|---|---|
| status | `GET /status` |
| settings | `GET /settings[?profile=…]` (the schema and values of every setting), `PUT /settings` (`{"key": "value", …}`, an empty value = default; the lists `pools.pearl`, `pools.randomx`, `schedule` and `autopause` take a JSON list); `PUT /gpus/<gpu>/settings` (`power_limit`, `power_max`, `mem_clock`, `gpu_clock`, applied at once; `<gpu>` here and `gpu` in request bodies: a GPU number, UUID or PCI address) |
| pools | `GET /pools`, `PUT /pools/pearl` and `/pools/randomx` |
| profiles | `GET /profiles`, `POST /profiles`, `DELETE /profiles/<name>`, `POST /profiles/<name>/run`, `PUT /schedule` |
| auto-pause | `GET/PUT /autopause` |
| control | `POST /pause` (`{"what": "all|gpus|cpu"}`), `POST /resume`, `POST /restart`, `POST /stop` |
| tuning | `GET/POST/DELETE /tune` (auto-tunes and scans, the kept runs), `GET /tune/<gpu>/runs/<time>`, `POST /tune/apply`; `GET/POST/DELETE /sweep`; `GET/POST/DELETE /cpu/sweep`; `GET /cpu`, `GET /cpu/plan` |
| electricity | `GET /electricity`, `GET /electricity/providers` |
| statistics | `GET /history?metrics=a,b&from=&to=&points=`, `GET /metrics` (the recorded metrics), `GET /events`, `GET /log?lines=`, `GET/PUT /dashboards` |
| accounts | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/password`, `POST|PUT|DELETE /auth/totp`, `GET/POST /users`, `PUT/DELETE /users/<name>`, `GET/POST /tokens`, `PUT/DELETE /tokens/<name>` |

Outside the API: `GET /summary` is the plain JSON snapshot HiveOS reads
(hashrate, shares, per-GPU hashrate, power, temperature, fan, clocks, the
CPU), and `GET /metrics` the Prometheus text format.

## Prometheus

`GET /metrics` (with a token, or from this machine) exports gauges and
counters named `cavaminer_…`: `hashrate{algo}`, `gpu_hashrate`,
`gpu_power_watts`, `gpu_power_limit_watts`, `gpu_temperature_celsius`,
`gpu_fan_percent`, `gpu_clock_mhz`, `gpu_paused` (all with `gpu` and
`name` labels), `shares_total{algo,result}`, `electricity_price{unit}`,
`electricity_mining`, `electricity_gpu_cost_per_hour`,
`electricity_cost_per_hashrate`, `devfee_active{algo}`,
`devfee_shares_total{algo,result}` and `uptime_seconds`.

## Home Assistant

The package's `integrations/homeassistant/custom_components/cavaminer` is
a Home Assistant integration: copy that folder into Home Assistant's
`config/custom_components/`, restart Home Assistant, add "CavaMiner"
(Settings → Devices & services) with the miner's address and an API token
(`cavaminer token add home-assistant`; the miner's `miner.api` must be
reachable from Home Assistant). It makes sensors of everything the status
has (hashrates, shares, every GPU's power, temperature, fan, clocks,
efficiency and state, the CPU and its power, the electricity price and
decision, the profile, the dev fee), a mining switch (pause/resume), a
profile select, restart and auto-tune buttons, each GPU's power limit and
clock locks as numbers, and an entity for every setting of the miner
(switch, number, select or text by type; the kernel ones disabled by
default). The lists (pools, schedule, auto-pause triggers) are sensors
with the entries as an attribute. Any setting can be changed with the
service `cavaminer.set_setting` (key, value — a list for the lists —,
optional profile); also `cavaminer.pause`, `resume`, `restart`,
`run_profile`. Its own README has the details.

## Command line: config and ctl

Every setting can be read and set from the command line, and the running
miner controlled through its API:

```sh
./cavaminer config list [--all] [--profile night]   # the settings (and their defaults)
./cavaminer config set electricity.max_price 1.5     # saved; a running miner reads it within seconds
./cavaminer config set randomx.threads 24 --profile night
./cavaminer config set gpu.0.power_limit 400         # GPU 0 (a GPU number, UUID or PCI address)
./cavaminer config unset electricity.max_price
./cavaminer config set schedule '[{"cron": "0 22 * * *", "profile": "night"}]'   # lists as JSON
./cavaminer config get pools.pearl                   # (pools.randomx, schedule, autopause)
./cavaminer --set electricity.max_price=1.2 …        # for this run only
./cavaminer ctl status | pause [all|gpus|cpu] | resume | restart | stop | tune [--gpu N]
./cavaminer ctl set gpu.0.power_limit 380            # through the running miner's API (applied at once)
```

`ctl` talks to the running miner's API (its address from the settings);
with users set up it needs a token (`--token` or `CAVA_TOKEN`). The keys
are those of `config list --all` (also the command-line names, e.g.
`rx_threads`).

## Statistics

Every 10 seconds (`stats.interval`) the miner records each GPU's hashrate,
power, power limit and ceiling, temperature, fan, clocks, efficiency and
tuning (offset, clock locks and cap), shares, RandomX (and, as root, the
CPU's package power from its RAPL counters), the electricity price, limit
and decision, what the GPUs' electricity costs (`electricity.gpu_cost`,
per hour, and `pearl.cost_per_hashrate`, per TH/s per day: the cost side
of mining's "hashprice"), and pauses — plus events (starts, restarts,
pauses, profile changes, price decisions, tuning results, settings
changes) — in `cavaminer.stats.db` (SQLite). Older samples become
averages (`stats.downsample`, default `1d:1m, 14d:15m, 180d:1h, 2y:1d`:
after a day 1-minute averages, after two weeks 15-minute ones, …, min and
max kept), samples older than `stats.retention` go (default `unlimited`;
e.g. `90d`, `6m`, `2y`), and the file stays under `stats.max_size`
(default `1GB`; the oldest samples go first and the space is freed). The
web interface's charts, the Statistics page (with CSV export), the API's
`/history` and Home Assistant read them; `stats.enabled = false` turns the
recording off.

## Dev fee

CavaMiner mines a share of the time for its development: 1 % of the
PearlHash and 1 % of the RandomX mining time (one minute per 100 minutes
of mining each). It pays for, among other
things, hardware to support and tune for more GPUs and CPUs. The first
window comes at a random point of the first 100 minutes; paused time
(electricity price, auto-pause, by you) does not count. Your pool
connection stays open meanwhile and mining returns to your pool's latest
job right after.

While it runs, the log says `dev fee: mining for CavaMiner's development`,
the menu shows `DEV FEE PearlHash 1 %` (or RandomX 1 %), the web interface
a "dev fee" badge, and `/api/v1/status` (`devfee`), Prometheus
(`cavaminer_devfee_active`) and Home Assistant (a "Dev fee" sensor) report
it; its shares are counted apart from yours. The dev-fee connections go
over TLS, with the certificate pinned, to `prl.devfee.cavalius.net` and
`xmr.devfee.cavalius.net` (port 443). If they cannot be reached, or send
no job within 10 seconds, the miner keeps mining for you and tries again
100 minutes of mining later; RandomX skips the dev fee when its pool works
on another seed than yours (a coin other than Monero), so the dataset is
never rebuilt for it. A dry run (`--dry-run`) has no dev fee.

## Reference

### Command-line options

`cavaminer [options] [command]`. Without a command the miner mines;
options also take the form `--option=value`.

Mining and pools:

| option | default | |
|---|---|---|
| `-o, --url <url>` | | PearlHash pool, `host:port` or `stratum+ssl://host:port` (repeat for failover; replaces the list of the settings file; also `PEARL_POOL`) |
| `-u, --user` | | PearlHash login: `wallet` or `wallet.worker` (for pools without a login of their own; `PEARL_USER`) |
| `-w, --worker` | | worker name, for pools without one of their own (overrides the `.worker` part of `--user`; `PEARL_WORKER`) |
| `-p, --password` | `x` | PearlHash pool password, for pools without one of their own (sent with the login when it is not `x`) |
| `-d, --devices` | `all` | GPU numbers, e.g. `0,1` (the order of `nvidia-smi` and `cavaminer devices`), or `none` |
| `--proof` | `zst` | share encoding: `zst` (about 3 KB) or `plain` (about 136 KB) |
| `--job-timeout` | `180` | reconnect when the pool sends no job for this many seconds (at least 30) |
| `--dry-run` | | mine and verify shares without submitting them (no dev fee) |
| `--rx-url <url>` | | RandomX pool, `host:port` (repeat for failover; replaces the list; `CAVA_RX_POOL`) |
| `--rx-user` | | RandomX login (for pools without one): the wallet address; for p2pool any name, `name+N` fixes the share difficulty (`CAVA_RX_USER`) |
| `--rx-pass` | `x` | RandomX pool password, for pools without one of their own (usually the worker name) |
| `--rx-enabled` | `true` | RandomX on or off (a profile can switch it off and keep the pools) |

GPU settings (one value for all GPUs or a comma-separated list, one per GPU in `-d` order; need root):

| option | default | |
|---|---|---|
| `--power-limit` | | power limit in W, set before mining starts |
| `--power-max` | | hard power ceiling in W (sweeps, tuning and the menu stay below); default `--power-limit`, else the limit at start |
| `--mem-clock` | | lock the memory clock (MHz) while mining |
| `--gpu-clock` | | lock the GPU clock (MHz) while mining |
| `--gpu-clock-max` | | highest GPU clock (MHz), the clock can still drop |
| `--gpu-offset` | | clock offset of the voltage/frequency curve (MHz, undervolting) |

Tuning:

| option | default | |
|---|---|---|
| `--autotune` | | find the most efficient memory clock and GPU clock lock while mining, then keep mining with them (safe range) |
| `--tune-window` | `20` | auto-tune: seconds per setting |
| `--tune-min-hashrate` | `0` | auto-tune: never choose a setting below this % of the best hashrate (0 = pure efficiency) |
| `--tune-file` | `cavaminer-tune.json` | where the auto-tune and scan runs are kept (the latest 20 per GPU) |
| `--sweep` | | sweep the power limit while mining and save the curve |
| `--sweep-min`, `--sweep-max` | the GPU's range | sweep limits in W (at most the ceiling) |
| `--sweep-step` | `5` | W between sweep points |
| `--sweep-window` | `16` | seconds per sweep point (plus half as long to settle) |
| `--sweep-file` | `cavaminer-sweeps.json` | where sweep results are kept (the latest per GPU) |
| `--autotune-offset` | | find each GPU's highest stable clock offset at its power limit (undervolting) |
| `--offset-step` | `50` | offset search: MHz between offsets |
| `--offset-max` | `1000` | offset search: the highest offset tried |
| `--offset-margin` | `50` | offset search: the saved offset stays this far below the highest offset without errors |
| `--self-check` | `1024` with an offset, else off | every this many attempts one is computed twice and compared; 0 = off |

RandomX:

| option | default | |
|---|---|---|
| `--rx-threads` | `0` | hashing threads; 0 = from the caches (see RandomX on the CPU) |
| `--rx-threads-per-socket` | `0` | that many threads on every socket instead; 0 = off |
| `--rx-affinity` | `auto` | CPUs for the threads, e.g. `0-15,64-79` (with `--rx-threads 0`: one thread per listed CPU) |
| `--rx-nice` | `19` | priority of the hashing threads (0 normal … 19 lowest) |
| `--rx-huge-pages` | `true` | 2 MiB pages for the dataset, cache and scratchpads (reserved as root) |
| `--rx-1gb-pages` | `false` | the dataset on three 1 GiB pages (reserved as root) |
| `--rx-msr` | `true` | the MSR tweak (AMD Zen 2 to 5, Intel; as root, restored on exit) |
| `--rx-max-freq` | `0` | maximum CPU clock in MHz for all CPUs while RandomX mines; 0 = off (as root, restored on exit and while paused) |

Settings, output and process:

| option | default | |
|---|---|---|
| `--config` | `cavaminer.toml` | the settings file (everything else is kept next to it) |
| `--profile` | | run this profile (the schedule and the menu's choice are then ignored; `base` = none) |
| `--set key=value` | | a setting for this run only (any key of `config list --all`; repeatable) |
| `--api` | `127.0.0.1:4078` | address of the web interface, API, `/summary` and `/metrics`; `0` = off |
| `--status-interval` | `30` | seconds between status lines (without the menu; at least 5) |
| `--log` | `info` | log level (`info`, `debug`, `warn`, or filters such as `cavaminer=debug`) |
| `--log-file` | | also write the log to this file (default with `--daemon`: `cavaminer.log` next to the settings file) |
| `--no-tui` | | log lines instead of the menu |
| `--plain` | | plain text: no menu, no colours or other control codes, simple prompts |
| `-q, --quiet` (`--silent`) | | no output at all (the log still goes to `--log-file`) |
| `-B, --daemon` (`--background`) | | run in the background |
| `--pid-file` | | write the process id here (default with `--daemon`: `cavaminer.pid` next to the settings file) |

PearlHash kernel (advanced; the defaults are the measured best, change them only for experiments):

| option | default | |
|---|---|---|
| `--kernel` | `auto` | kernel variant: `auto` = `mma52` on the RTX 50 series, `mma17g` on the RTX 30 series, else `mma17h`; a mixed set of GPUs gets one tile kind (`mma51`); also `mma17`, `mma17p`, `mma23`, `mma23p`, `mma51`, and the signal-0 experiments `mma50`, `mma50s` |
| `--m` | `0` | rows of A per attempt; 0 = automatic (16384; 8192 with the resident RTX 50 kernels) |
| `--n` | `65536` | columns of B per job (a wide B amortises the preparation of A) |
| `--k` | `0` | common dimension, a multiple of 2048; 0 = automatic (8192 when every GPU builds its operand in the kernel and has an L2 of at least 4 MB, else 4096 on GPUs with a large L2, else 2048) |
| `--signal` | `63` | the constant signal value of the matrices, -64 to 64 (63 keeps every GPU operand non-negative, which saves energy; the RTX 50 kernels take 63 or 64 only) |
| `--stages` | `4` | pipeline stages of the GEMM |
| `--group` | `0` | raster group size; 0 = from the L2 size |
| `--local-diff` | | testing: this share difficulty instead of the pool's (with `--dry-run` only) |

Commands (each takes `--config`):

| command | |
|---|---|
| `devices` | the GPUs, numbered in PCI bus order, with the CUDA and driver versions, the settings each gets and what the next start would change |
| `gpu-procs [seconds]` | the programs using each GPU and how much (for auto-pause triggers) |
| `hugepages [--threads N] [--persist]` | show and reserve the huge pages RandomX needs (as root); `--persist` also reserves them at boot |
| `rx-bench [seconds] [--v2]` | an offline RandomX benchmark with the RandomX settings (no pool), 60 s by default; `--v2`: RandomX v2 |
| `prices [--list]` | the coming electricity prices with the settings applied; `--list`: the providers and Danish grid companies |
| `config list [--all] [--profile P]`, `config get KEY`, `config set KEY VALUE`, `config unset KEY` | the settings file |
| `ctl status / pause [all|gpus|cpu] / resume / restart / stop / tune [--gpu G] [--min-hashrate %] / set KEY VALUE` | the running miner, through its API (`--token` or `CAVA_TOKEN` once users exist) |
| `user add NAME [--role admin|viewer] [--totp] [--local-only]`, `user access NAME local|any`, `user passwd NAME`, `user totp NAME [--off]`, `user del NAME`, `user list` | the web interface's users |
| `token add NAME [--role …] [--local-only]`, `token access NAME local|any`, `token del NAME`, `token list` | API tokens |
| `stop [--pid-file F]` | stop the miner running in the background |

### Settings file

`cavaminer.toml` (`--config`), TOML. The keys as `cavaminer config list
--all`, the menu and the web interface name them (`section.key` is
`[section]` / `key = …` in the file), with their defaults; "profile" means
a profile can override it; "restart" that a change applies after a
restart (everything else applies at once).

| key | default | | |
|---|---|---|---|
| `miner.devices` | `all` | profile, restart | GPUs: `all`, a list such as `0,1`, or `none` |
| `pool.proof` | `zst` | profile, restart | share encoding `zst` or `plain` |
| `miner.dry_run` | `false` | profile, restart | mine and check shares without sending them |
| `miner.job_timeout` | `180` | profile, restart | seconds without a new job before reconnecting |
| `miner.follow_gpus` | `true` | restart | a card moved to another slot keeps its settings |
| `randomx.enabled` | `true` | profile, restart | RandomX on or off |
| `randomx.threads` | `auto` | profile, restart | hashing threads: `auto` or a number |
| `randomx.threads_per_socket` | `off` | profile, restart | threads on every socket instead |
| `randomx.affinity` | `auto` | profile, restart | the CPUs, e.g. `0-15,32-47` |
| `randomx.nice` | `19` | profile, restart | thread priority, 0 normal … 19 lowest |
| `randomx.huge_pages` | `true` | profile, restart | 2 MiB pages |
| `randomx.pages_1gb` | `false` | profile, restart | the dataset on 1 GiB pages |
| `randomx.msr` | `true` | profile, restart | the MSR tweak |
| `randomx.max_freq` | `off` | profile | maximum CPU clock in MHz for all CPUs while RandomX mines |
| `miner.m`, `miner.n`, `miner.k`, `miner.signal`, `miner.kernel`, `miner.stages`, `miner.group` | as the options | profile, restart | the PearlHash kernel (advanced) |
| `miner.api` | `127.0.0.1:4078` | profile, restart | where the web interface, API, `/summary` and `/metrics` listen; `0` = off |
| `web.tls` | `false` | restart | HTTPS (a self-signed certificate is made unless `web.cert` and `web.key` are set) |
| `web.cert`, `web.key` | | restart | PEM certificate chain and private key |
| `web.session_hours` | `168` | | hours a login lasts |
| `web.public_summary` | `false` | | `/summary` for every client, not only this machine |
| `web.remote_users`, `web.remote_tokens` | `true` | | users / API tokens may be used from other machines |
| `stats.enabled` | `true` | restart | record statistics |
| `stats.interval` | `10` | | seconds between samples |
| `stats.retention` | `unlimited` | | e.g. `90d`, `6m`, `2y` |
| `stats.max_size` | `1GB` | | e.g. `500MB`, `2GB`, `unlimited` (with the unit; at least 1MB) |
| `stats.downsample` | `1d:1m, 14d:15m, 180d:1h, 2y:1d` | | `<age>:<resolution>, …` |
| `miner.log` | `info` | profile, restart | log level |
| `miner.status_interval` | `30` | profile, restart | seconds between status lines |
| `electricity.enabled` | `true` | | `false` keeps the price settings without using them |
| `electricity.provider` | | | a provider id (`cavaminer prices --list`), `url` or `command`; empty = off |
| `electricity.area` | the provider's first | | the price area or region, e.g. `DK1` |
| `electricity.currency` | the provider's first | | where the provider has several |
| `electricity.token` | | | API token for providers that need one |
| `electricity.url` | | | your own source: the URL (`provider = "url"`) |
| `electricity.command` | | | your own source: the command (`provider = "command"`) |
| `electricity.interval` | `5` | | minutes between polls of your own source |
| `electricity.grid` | | | Danish grid company |
| `electricity.factor` | `1` | | spot price × factor (e.g. a currency conversion) |
| `electricity.markup` | `0` | | added per kWh (supplier markup, taxes not covered otherwise) |
| `electricity.tariffs` | | | time-of-day additions: `<cron time> = <price>; …` (a list of `{ when, price }` tables in the file) |
| `electricity.vat` | `0` | | VAT in percent, applied to the sum |
| `electricity.max_price` | | | mine while the price per kWh is at most this |
| `electricity.cheapest_hours` | `0` | | also mine during this many cheapest hours of each day |
| `electricity.action` | `pause` | | `pause`, `pause-gpus`, `pause-cpu` or `profile:<name>` |
| `electricity.missing` | `mine` | | `mine` or `pause` while no price is known |
| `electricity.timezone` | the market's (your own source: the system's; set it on Windows) | | for the tariff times and the cheapest hours |
| `pools.pearl`, `pools.randomx` | `[]` | profile, restart | the pool lists (`[[pools]]` and `[[randomx.pools]]` tables in the file; JSON lists on the command line and in the API) |
| `schedule` | `[]` | | `[[schedule]]` entries: `cron`, `profile` |
| `autopause` | `[]` | | `[[autopause]]` triggers (see Auto-pause) |

GPU settings are `[[gpu]]` tables with `uuid`, `name`, `pci_bus_id` and
`power_limit`, `power_max`, `mem_clock`, `gpu_clock`, `gpu_offset`,
`gpu_clock_max` (`gpu.<GPU>.<field>` for `--set`, `config set` and `ctl
set`; `ctl set` applies at once, `config set` after a restart); profiles are `[profiles.<name>.miner]`, `[profiles.<name>.randomx]`,
`[profiles.<name>.pool]`, `[[profiles.<name>.pools]]`,
`[[profiles.<name>.randomx.pools]]` and `[[profiles.<name>.gpu]]` sections
with the same keys. The file also records the profile chosen by hand
(`[manual]`) and a pause by you (`paused`).

### Files

Next to the settings file (`cavaminer.toml` → `cavaminer.<ext>`):

| file | |
|---|---|
| `cavaminer.toml` | the settings |
| `cavaminer.stats.db` (and `-wal`, `-shm`) | the statistics and events (SQLite); also the saved dashboards |
| `cavaminer.auth.json` | users and API tokens (hashed); readable by its owner only |
| `cavaminer.prices.json` | the cached electricity prices and tariffs |
| `cavaminer.cpusweep.json` | the latest CPU clock sweep |
| `cavaminer.web.crt`, `cavaminer.web.key` | the self-signed certificate for HTTPS |
| `cavaminer.log`, `cavaminer.pid` | the log and process id of a `--daemon` (unless `--log-file` / `--pid-file` say otherwise) |
| `cavaminer-offset-trial.json`, `cavaminer-offsets.json` | the offset search's trials and results |

In the directory the miner is started from (or where the option points):
`cavaminer-tune.json` (`--tune-file`) and `cavaminer-sweeps.json`
(`--sweep-file`). `cavaminer hugepages --persist` writes
`/etc/sysctl.d/60-cavaminer-hugepages.conf`. Files written under the
miner's previous name (`pearlminer.toml`, `pearlminer-sweeps.json`,
`pearlminer-tune.json`) are renamed on the first start when the default
names are used.

### Environment variables

| variable | |
|---|---|
| `PEARL_POOL`, `PEARL_USER`, `PEARL_WORKER` | as `-o`, `-u`, `-w` |
| `CAVA_RX_POOL`, `CAVA_RX_USER` | as `--rx-url`, `--rx-user` |
| `CAVA_TOKEN` | the API token for `cavaminer ctl` |
| `NO_COLOR` | no colours in the log, a monochrome menu |
| `TZ` | the local time zone (the schedule, the electricity price's default) |
| `CAVA_RX_NUMA=0` | one RandomX dataset for all NUMA nodes instead of one per node |

### Signals

SIGINT (Ctrl-C) and SIGTERM stop the miner and restore the GPUs and the
CPU; SIGHUP restarts a `--daemon` with the saved settings (also after the
binary was replaced by a newer one) and stops a miner in the foreground
(`cavaminer ctl restart` restarts either). On Windows, Ctrl-C, closing the
window, logging off and shutting down stop it, with the GPUs restored;
`cavaminer ctl restart` restarts it.

## Troubleshooting

| | |
|---|---|
| "the NVIDIA driver supports CUDA x.y, but this build's kernels need …", "RTX 50 series GPUs need an NVIDIA driver of at least 575" | the driver is too old: 525 or newer (580 for the CUDA 13 kernels), RTX 50 series 575 or newer |
| "nothing to mine" | no pool is set: run the first-start questions in a terminal, or give `-o` / `--rx-url` |
| "another miner (pid …) is running" | a background miner with the same pid file: `cavaminer stop` first |
| the web interface is not reachable from another machine | `miner.api` is `127.0.0.1:4078` (this machine only): set `0.0.0.0:4078` and create a user (`cavaminer user add`); API tokens work without one |
| RandomX is slow, "huge pages" warnings | the huge pages are not reserved: start as root once, or `sudo cavaminer hugepages --persist` |
| RandomX shows fewer threads than cores | the default is what the caches hold (2 MiB per thread); set `randomx.threads` to try more |
| shares rejected by a pool | the miner switches to uncompressed proofs for pools that need them after the first rejection; a steady stream of rejections means a wrong login or an unsupported pool |
| wrong results or a hung GPU after an offset search | too high an offset: the next search stays below it (`cavaminer-offset-trial.json`); lower `gpu_offset` or set it to 0, and reboot if the GPU hangs |
| the power limit or clocks changed outside the miner | an overclocking tool or `nvidia-smi` runs beside it: let one of them manage the GPU |
| clocks are still locked, or a clock offset still set, after a crash | `sudo nvidia-smi -rgc` and `sudo nvidia-smi -rmc` reset the locks; the offset is reset when the next run that sets one (`gpu_offset`, or `--gpu-offset 0`) exits |
| "web interface off: cannot listen on …" | the address is in use (another miner shutting down is waited for 30 s): change `miner.api` |
| the electricity page shows "no prices yet" | the source answered nothing yet or needs a token or area: `cavaminer prices` prints the error, `cavaminer prices --list` the areas |
| Windows: "An Application Control policy has blocked this file" | Smart App Control blocks the unsigned program (see Windows); a signed release will follow |
| Windows: power limits and clocks are refused, RandomX runs on normal pages | the terminal is not elevated (run it as administrator), or the account lacks "Lock pages in memory" (`cavaminer hugepages --persist`) |

## License

CavaMiner is free to use, on any number of computers, privately or
commercially, and the unchanged release may be passed on free of charge;
modifying it and reverse engineering it are not allowed, except that the
integrations (such as Home Assistant) may be changed and passed on
(`LICENSE`). The open-source components it contains keep their own
licenses (`THIRD-PARTY-NOTICES.txt`).

