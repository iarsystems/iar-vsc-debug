/*
 * Copyright (c) 1996 - 2016 IAR Systems AB.
 *
 * IAR Embedded Workbench tutorial
 *
 * Fibonacci.c
 *
 * Prints the Fibonacci sequence.
 *
 * See the file <cpuname>/doc/licenses/IARSourceLicense.txt for detailed
 * license information.
 *
 * $Revision: 113247 $
 */

#include <stdint.h>
#include "Fibonacci.h"

static void NextCounter(void);
static void DoForegroundProcess(void);

static int_fast8_t callCount;


/* Increase the 'callCount' variable by one. */
static void NextCounter(void)
{
  callCount += 1;
}

/* Increase the 'callCount' variable. */
/* Get and print the associated Fibonacci number. */
static void DoForegroundProcess(void)
{
  volatile uint32_t fib = 0; // volatile so it isn't placed in a register
  NextCounter();
  fib = GetFib(callCount);
  PutFib(fib);
}

/* Main program. */
/* Prints the Fibonacci sequence. */
int32_t main(void)
{
  callCount = 0;

  InitFib();

  while (callCount < MAX_FIB)
  {
    DoForegroundProcess();
  }
  long test = (long) str; // prevent str from being optimized away
  nested_struct.un.a = 42; // prevent nested_struct from being optimized away
  nested_struct2.un.a = 0; // prevent nested_struct2 from being optimized away
  return 0;
}
