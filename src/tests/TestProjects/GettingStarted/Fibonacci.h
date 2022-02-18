/*
 * Copyright (c) 1996 - 2016 IAR Systems AB.
 *
 * IAR Embedded Workbench tutorial.
 *
 * Fibonacci.h
 *
 * Header file for Fibonacci.c.
 *
 * See the file <cpuname>/doc/licenses/IARSourceLicense.txt for detailed
 * license information.
 *
 * $Revision: 113247 $
 */

#ifndef TUTOR_H
#define TUTOR_H
#include "Utilities.h"

// some global variables for testing purposes
const char *str = "This is a sträng";
// for testing nested variables
struct nest {
	union
	{
		int a; char b;
	} un;
	struct {
		union {
			int c; char d;
		} inner_inner;
		int e;
	} inner;
};
struct nest nested_struct;
struct nest nested_struct2;

struct recursive {
	int a;
	struct recursive *self;
};
struct recursive references_self = { 10, &references_self };


#endif
